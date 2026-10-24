package ai.auralis.vsd;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST face of the MCP gateway for the VSD UI. */
@RestController
@RequestMapping("/api")
public class VsdController {

    private final McpGateway mcp;

    public VsdController(McpGateway mcp) {
        this.mcp = mcp;
    }

    @GetMapping("/servers")
    public List<McpGateway.ServerState> servers() {
        return mcp.servers();
    }

    @GetMapping("/tools")
    public List<McpGateway.ToolInfo> tools() {
        return mcp.tools();
    }

    @PostMapping("/call/{server}/{tool}")
    public McpGateway.Result call(@PathVariable String server, @PathVariable String tool,
                                  @RequestBody(required = false) Map<String, Object> args) {
        return mcp.call(server, tool, args);
    }
}
