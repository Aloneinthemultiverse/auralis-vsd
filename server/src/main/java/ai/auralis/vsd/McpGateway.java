package ai.auralis.vsd;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.HttpClientStreamableHttpTransport;
import io.modelcontextprotocol.spec.McpSchema;
import jakarta.annotation.PreDestroy;

/**
 * Holds one MCP client per configured server (Auralis core, semiconductor),
 * connecting lazily and reconnecting after a failure, so VSD starts and keeps
 * working even while a server is down.
 */
@Component
public class McpGateway {

    private static final Logger log = LoggerFactory.getLogger(McpGateway.class);

    /** A tool as the UI needs it. */
    public record ToolInfo(String server, String name, String description, Map<String, Object> inputSchema) {
    }

    /** The text of a tool result and whether the server flagged it as an error. */
    public record Result(String text, boolean error) {
    }

    /** Connection state of one server. */
    public record ServerState(String name, String url, boolean connected, String serverName, String detail) {
    }

    private final VsdProperties props;
    private final Map<String, McpSyncClient> clients = new ConcurrentHashMap<>();
    private final Map<String, String> lastError = new ConcurrentHashMap<>();

    public McpGateway(VsdProperties props) {
        this.props = props;
    }

    public List<ServerState> servers() {
        List<ServerState> out = new ArrayList<>();
        for (var e : props.servers().entrySet()) {
            String name = e.getKey();
            try {
                McpSyncClient c = client(name);
                c.ping();
                var info = c.getServerInfo();
                out.add(new ServerState(name, e.getValue().url(), true,
                        info == null ? name : info.name() + " " + info.version(), "ok"));
            } catch (RuntimeException ex) {
                drop(name, ex);
                out.add(new ServerState(name, e.getValue().url(), false, null, lastError.get(name)));
            }
        }
        return out;
    }

    public List<ToolInfo> tools() {
        List<ToolInfo> out = new ArrayList<>();
        for (String name : props.servers().keySet()) {
            try {
                for (McpSchema.Tool t : client(name).listTools().tools()) {
                    out.add(new ToolInfo(name, t.name(), t.description(), t.inputSchema()));
                }
            } catch (RuntimeException ex) {
                drop(name, ex);
            }
        }
        return out;
    }

    public Result call(String server, String tool, Map<String, Object> args) {
        if (!props.servers().containsKey(server)) {
            return new Result("Unknown MCP server: " + server, true);
        }
        Map<String, Object> clean = new LinkedHashMap<>();
        if (args != null) {
            args.forEach((k, v) -> {
                if (v != null && !(v instanceof String s && s.isBlank())) {
                    clean.put(k, v);
                }
            });
        }
        try {
            McpSchema.CallToolResult r = client(server).callTool(new McpSchema.CallToolRequest(tool, clean));
            StringBuilder sb = new StringBuilder();
            for (McpSchema.Content c : r.content()) {
                if (c instanceof McpSchema.TextContent t) {
                    sb.append(t.text());
                } else {
                    sb.append("[").append(c.type()).append(" content]");
                }
            }
            return new Result(sb.toString(), Boolean.TRUE.equals(r.isError()));
        } catch (RuntimeException ex) {
            drop(server, ex);
            return new Result(server + " MCP call failed: " + lastError.get(server), true);
        }
    }

    private McpSyncClient client(String name) {
        return clients.computeIfAbsent(name, n -> {
            VsdProperties.Server s = props.servers().get(n);
            var transport = HttpClientStreamableHttpTransport.builder(s.url()).endpoint(s.endpoint()).build();
            McpSyncClient c = McpClient.sync(transport)
                    .requestTimeout(props.requestTimeout())
                    .clientInfo(new McpSchema.Implementation("auralis-vsd", "0.1.0"))
                    .build();
            c.initialize();
            log.info("Connected to MCP server {} at {}{}", n, s.url(), s.endpoint());
            return c;
        });
    }

    private void drop(String name, RuntimeException ex) {
        String msg = ex.getMessage();
        for (Throwable t = ex.getCause(); t != null; t = t.getCause()) {
            if (t.getMessage() != null) {
                msg = t.getMessage();
            }
        }
        lastError.put(name, msg == null ? ex.getClass().getSimpleName() : msg);
        McpSyncClient c = clients.remove(name);
        if (c != null) {
            try {
                c.close();
            } catch (RuntimeException ignored) {
                // already broken
            }
        }
    }

    @PreDestroy
    void close() {
        clients.values().forEach(McpSyncClient::closeGracefully);
    }
}
