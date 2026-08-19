package net.jakedot.ivc;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

public class IvcClientIntegrationTest {
    private MockWebServer mockWebServer;
    private IvcClient client;
    private IvcIdentity identity;

    @BeforeEach
    public void setup() throws IOException {
        // Start an isolated local HTTP Server to instrument testing against
        mockWebServer = new MockWebServer();
        mockWebServer.start();
        
        identity = new IvcIdentity("instrumentation_bot");
        client = new IvcClient(mockWebServer.url("/").toString(), identity);
    }

    @AfterEach
    public void teardown() throws IOException {
        mockWebServer.shutdown();
    }

    @Test
    public void testSendMessageHasValidCryptoSignatures() throws Exception {
        // Mock a successful 200 OK from the Node backend
        mockWebServer.enqueue(new MockResponse().setResponseCode(200).setBody("{\"status\":\"ok\"}"));
        
        // Action
        client.sendMessage("#general", "Hello from Java Instrumentation!");
        
        // Verify Network Request
        RecordedRequest request = mockWebServer.takeRequest();
        
        assertEquals("/%23general", request.getPath(), "Path should URL encode the # symbol");
        assertEquals("POST", request.getMethod(), "Should be a POST request");
        
        // Verify Crypto Engine injected correctly
        assertEquals("@instrumentation_bot", request.getHeader("X-IVC-User"));
        assertNotNull(request.getHeader("X-IVC-Signature"), "Missing Signature Header");
        assertNotNull(request.getHeader("X-IVC-Timestamp"), "Missing Timestamp Header");
        assertEquals(identity.getPublicKeyBase64(), request.getHeader("X-IVC-PubKey"), "Pubkey Mismatch");
        
        String body = request.getBody().readUtf8();
        assertTrue(body.contains("\"msg\":\"Hello from Java Instrumentation!\""), "JSON Body mismatch");
    }
    
    @Test
    public void testSseConnectionStream() throws Exception {
        // Mock an open SSE stream pushing a test event
        String mockSseStream = "data: {\"type\":\"ivc_post\",\"msg\":\"live_stream_test\"}\n\n";
        mockWebServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "text/event-stream")
                .setBody(mockSseStream));
                
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMsg = new AtomicReference<>();
        
        // Action
        client.connectSse(msg -> {
            receivedMsg.set(msg);
            latch.countDown();
        });
        
        // Assertions
        boolean completed = latch.await(2, TimeUnit.SECONDS);
        assertTrue(completed, "Did not receive SSE message in time. Stream failed.");
        assertEquals("{\"type\":\"ivc_post\",\"msg\":\"live_stream_test\"}", receivedMsg.get(), "SSE data payload mismatch");
    }
}
