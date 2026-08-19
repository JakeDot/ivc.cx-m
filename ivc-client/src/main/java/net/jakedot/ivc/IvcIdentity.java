package net.jakedot.ivc;

import org.bouncycastle.crypto.generators.Ed25519KeyPairGenerator;
import org.bouncycastle.crypto.params.Ed25519KeyGenerationParameters;
import org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters;
import org.bouncycastle.crypto.params.Ed25519PublicKeyParameters;
import org.bouncycastle.crypto.signers.Ed25519Signer;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class IvcIdentity {
    private final String username;
    private final Ed25519PrivateKeyParameters privateKey;
    private final Ed25519PublicKeyParameters publicKey;

    /**
     * Initializes a new identity with a freshly generated Ed25519 keypair.
     */
    public IvcIdentity(String username) {
        this.username = username.replace("@", "");
        Ed25519KeyPairGenerator keyPairGenerator = new Ed25519KeyPairGenerator();
        keyPairGenerator.init(new Ed25519KeyGenerationParameters(new SecureRandom()));
        
        var keyPair = keyPairGenerator.generateKeyPair();
        this.privateKey = (Ed25519PrivateKeyParameters) keyPair.getPrivate();
        this.publicKey = (Ed25519PublicKeyParameters) keyPair.getPublic();
    }

    public String getUsername() {
        return username;
    }

    public String getPublicKeyBase64() {
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    /**
     * Generates Zero-Trust Cryptographic Headers for the IVC protocol.
     */
    public Map<String, String> generateAuthHeaders(String method, String path, String body) {
        String timestamp = String.valueOf(System.currentTimeMillis());
        String bodyStr = (body != null && !body.isEmpty()) ? body : "";
        String message = timestamp + ":" + method + ":" + path + ":" + bodyStr;

        byte[] msgBytes = message.getBytes(StandardCharsets.UTF_8);
        
        Ed25519Signer signer = new Ed25519Signer();
        signer.init(true, privateKey);
        signer.update(msgBytes, 0, msgBytes.length);
        byte[] signatureBytes = signer.generateSignature();
        
        String signatureBase64 = Base64.getEncoder().encodeToString(signatureBytes);

        Map<String, String> headers = new HashMap<>();
        headers.put("X-IVC-User", "@" + username);
        headers.put("X-IVC-PubKey", getPublicKeyBase64());
        headers.put("X-IVC-Signature", signatureBase64);
        headers.put("X-IVC-Timestamp", timestamp);
        
        return headers;
    }
}
