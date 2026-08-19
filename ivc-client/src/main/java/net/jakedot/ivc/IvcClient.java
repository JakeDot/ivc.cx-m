package net.jakedot.ivc;

import com.google.gson.Gson;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

public class IvcClient {
    private final String baseUrl;
    private final IvcIdentity identity;
    private final HttpClient httpClient;
    private final Gson gson;

    public IvcClient(String baseUrl, IvcIdentity identity) {
        this.baseUrl = baseUrl.replaceAll("/$", "");
        this.identity = identity;
        this.httpClient = HttpClient.newHttpClient();
        this.gson = new Gson();
    }

    /**
     * Connects to the SSE IVC event stream.
     */
    public void connectSse(Consumer<String> onMessage) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/ivc/stream"))
                .header("Accept", "text/event-stream")
                .GET()
                .build();

        httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> {
                    System.out.println("[IVC Client] SSE Stream Connected.");
                    response.body().forEach(line -> {
                        if (line.startsWith("data: ")) {
                            onMessage.accept(line.substring(6));
                        }
                    });
                }).exceptionally(ex -> {
                    System.err.println("[IVC Client] SSE Connection dropped: " + ex.getMessage());
                    return null;
                });
    }

    /**
     * Sends a message securely to an IVC channel/target.
     */
    public void sendMessage(String targetChannel, String message) throws Exception {
        Map<String, String> payload = new HashMap<>();
        payload.put("msg", message);
        String bodyString = gson.toJson(payload);

        // URL encode the channel (e.g. #general -> %23general)
        String path = "/" + targetChannel.replace("#", "%23");
        Map<String, String> authHeaders = identity.generateAuthHeaders("POST", path, bodyString);

        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyString));

        authHeaders.forEach(reqBuilder::header);

        HttpResponse<String> res = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 400) {
            throw new RuntimeException("HTTP " + res.statusCode() + ": " + res.body());
        }
    }
}
