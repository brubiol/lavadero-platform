package com.lavadero.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class LavaderoApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(LavaderoApiApplication.class, args);
	}

}

