package net.jakedot.ivc;

import java.util.Scanner;

public class ExampleTerminalApp {
    public static void main(String[] args) throws Exception {
        System.out.println("=========================================");
        System.out.println("  IVC Java-25 Terminal Client (Ed25519)  ");
        System.out.println("=========================================");
        
        // 1. Generate identity
        IvcIdentity identity = new IvcIdentity("java_client");
        System.out.println("Identity Generated!");
        System.out.println("Username: @" + identity.getUsername());
        System.out.println("Pub Key:  " + identity.getPublicKeyBase64());
        System.out.println("-----------------------------------------");

        // 2. Setup Client
        // Ensure this points to your deployed Express host
        String host = "http://localhost:3000"; 
        IvcClient client = new IvcClient(host, identity);

        // 3. Open SSE Stream
        client.connectSse(msg -> {
            System.out.println("\n[Network]: " + msg);
            System.out.print("> ");
        });

        // 4. Input loop
        Scanner scanner = new Scanner(System.in);
        String currentChannel = "#general";
        System.out.println("Connected. Type to send a message to " + currentChannel + ".");
        System.out.println("Type '/channel #new' to switch targets.");
        
        while (true) {
            System.out.print("> ");
            String input = scanner.nextLine();
            if (input == null || input.isEmpty()) continue;
            
            if (input.startsWith("/channel ")) {
                currentChannel = input.substring(9).trim();
                System.out.println("Switched to " + currentChannel);
                continue;
            }

            if (input.equals("/quit")) {
                break;
            }

            try {
                client.sendMessage(currentChannel, input);
            } catch (Exception e) {
                System.err.println("Failed to send: " + e.getMessage());
            }
        }
        
        System.exit(0);
    }
}
