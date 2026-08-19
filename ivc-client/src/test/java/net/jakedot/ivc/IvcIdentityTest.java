package net.jakedot.ivc;

import org.junit.jupiter.api.Test;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class IvcIdentityTest {

    @Test
    public void testIdentityGeneration() {
        IvcIdentity identity = new IvcIdentity("jakedot");
        
        assertEquals("jakedot", identity.getUsername(), "Username should strip @ symbols if provided");
        assertNotNull(identity.getPublicKeyBase64(), "Public Key should not be null");
        assertFalse(identity.getPublicKeyBase64().isEmpty(), "Public Key should not be empty");
    }

    @Test
    public void testUsernameSanitization() {
        IvcIdentity identity = new IvcIdentity("@jakedot");
        assertEquals("jakedot", identity.getUsername(), "Username should strip the leading @ symbol");
    }

    @Test
    public void testSignatureHeaders() {
        IvcIdentity identity = new IvcIdentity("jakedot");
        
        String method = "POST";
        String path = "/%23general";
        String body = "{\"msg\":\"Hello IVC!\"}";
        
        Map<String, String> headers = identity.generateAuthHeaders(method, path, body);
        
        // 1. Verify standard injections
        assertEquals("@jakedot", headers.get("X-IVC-User"), "User header must append @");
        assertEquals(identity.getPublicKeyBase64(), headers.get("X-IVC-PubKey"), "Pubkey header must match");
        
        // 2. Verify Cryptographic Signatures exist
        assertNotNull(headers.get("X-IVC-Signature"), "Signature must be generated");
        assertNotNull(headers.get("X-IVC-Timestamp"), "Timestamp must be generated");
        
        // 3. Verify Timestamp is valid
        long timestamp = Long.parseLong(headers.get("X-IVC-Timestamp"));
        long now = System.currentTimeMillis();
        assertTrue(Math.abs(now - timestamp) < 5000, "Timestamp should be recent");
    }
}
