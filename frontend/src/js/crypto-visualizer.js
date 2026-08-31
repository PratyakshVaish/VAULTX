// Cryptography Visualizer & Inspector Logic

function updateCryptoInspector(publicKeyPem, ivBase64 = null, aesStatus = "AES-256-GCM Active") {
    try {
        const pubKeyEl = document.getElementById('inspect-public-key');
        const aesStatusEl = document.getElementById('inspect-aes-status');
        const ivValEl = document.getElementById('inspect-iv-val');

        if (pubKeyEl && publicKeyPem && typeof publicKeyPem === 'string' && publicKeyPem.length > 0) {
            const matches = publicKeyPem.match(/.{1,40}/g);
            if (matches) {
                pubKeyEl.value = "-----BEGIN RSA PUBLIC KEY-----\n" + matches.join('\n') + "\n-----END RSA PUBLIC KEY-----";
            }
        }

        if (aesStatusEl) {
            aesStatusEl.innerText = aesStatus;
        }

        if (ivValEl) {
            if (ivBase64) {
                ivValEl.innerText = "HEX/BASE64 IV: " + ivBase64;
            } else {
                ivValEl.innerText = "IV: RANDOM 12-BYTE NONCE PER OPERATION";
            }
        }
    } catch (e) {
        console.error("Crypto Inspector display notice:", e);
    }
}

function toggleInspector() {
    const inspector = document.getElementById('inspector-drawer');
    if (inspector) {
        inspector.classList.toggle('hidden');
    }
}
