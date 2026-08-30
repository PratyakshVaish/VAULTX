// Cryptography Visualizer & Inspector Logic

function updateCryptoInspector(publicKeyPem, ivBase64 = null, aesStatus = "AES-256-GCM Active") {
    const pubKeyEl = document.getElementById('inspect-public-key');
    const aesStatusEl = document.getElementById('inspect-aes-status');
    const ivValEl = document.getElementById('inspect-iv-val');

    if (pubKeyEl && publicKeyPem) {
        pubKeyEl.value = "-----BEGIN RSA PUBLIC KEY-----\n" + publicKeyPem.match(/.{1,40}/g).join('\n') + "\n-----END RSA PUBLIC KEY-----";
    }

    if (aesStatusEl) {
        aesStatusEl.innerText = "Algorithm: AES-256-GCM\nKey Size: 256 bits\nMode: Galois/Counter Mode";
    }

    if (ivValEl) {
        if (ivBase64) {
            ivValEl.innerText = "Hex/Base64 IV: " + ivBase64;
        } else {
            ivValEl.innerText = "IV: Random 12-Byte Nonce per Operation";
        }
    }
}

function toggleInspector() {
    const inspector = document.getElementById('inspector-drawer');
    if (inspector) {
        inspector.classList.toggle('hidden');
    }
}
