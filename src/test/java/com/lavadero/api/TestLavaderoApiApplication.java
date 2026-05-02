package com.lavadero.api;

import org.springframework.boot.SpringApplication;

public class TestLavaderoApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(LavaderoApiApplication::main)
				.with(TestcontainersConfiguration.class)
				.run(args);
	}

}
