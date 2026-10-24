package ai.auralis.vsd;

import java.time.Duration;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** The MCP servers VSD connects to, by name. */
@ConfigurationProperties("vsd")
public record VsdProperties(Map<String, Server> servers, Duration requestTimeout) {

    public record Server(String url, String endpoint) {
    }
}
