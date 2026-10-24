package ai.auralis.vsd;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** Auralis VSD: a semiconductor design studio that drives Auralis over MCP. */
@SpringBootApplication
@ConfigurationPropertiesScan
public class VsdApplication {

    public static void main(String[] args) {
        SpringApplication.run(VsdApplication.class, args);
    }
}
