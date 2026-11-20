/**
 * Native WebAuthn Client for Apple Face ID / Touch ID, Android Biometrics & Windows Hello
 * Standard W3C Web Authentication API (FIDO2)
 */

export function bufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function base64UrlToBuffer(base64url: string): ArrayBuffer {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Check if the browser & device support platform biometrics (Apple Face ID / Android Biometric / Windows Hello)
 */
export async function isPlatformBiometricAvailable(): Promise<{
    supported: boolean;
    deviceType: 'apple' | 'android' | 'windows' | 'generic';
    label: string;
}> {
    if (typeof window === 'undefined') {
        return { supported: false, deviceType: 'generic', label: 'ระบบชีวมิติ' };
    }

    const ua = navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod|macintosh/.test(ua);
    const isAndroid = /android/.test(ua);
    const isWindows = /windows/.test(ua);

    let deviceType: 'apple' | 'android' | 'windows' | 'generic' = 'generic';
    let label = 'สแกนชีวมิติ';

    if (isApple) {
        deviceType = 'apple';
        label = /macintosh/.test(ua) ? 'Touch ID / Apple Passkey' : 'Apple Face ID / Touch ID';
    } else if (isAndroid) {
        deviceType = 'android';
        label = 'สแกนลายนิ้วมือ / ใบหน้า (Android Biometrics)';
    } else if (isWindows) {
        deviceType = 'windows';
        label = 'Windows Hello (สแกนนิ้ว/ใบหน้า)';
    }

    if (
        !window.PublicKeyCredential ||
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
    ) {
        return { supported: false, deviceType, label };
    }

    try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return { supported: available, deviceType, label };
    } catch {
        return { supported: false, deviceType, label };
    }
}

/**
 * Register Apple Face ID / Android Biometrics (WebAuthn Attestation)
 */
export async function registerNativePasskey(options: {
    challenge: string;
    user: {
        id: number | string;
        name: string;
        displayName: string;
    };
    rp: {
        name: string;
        id: string;
    };
}): Promise<{
    credential_id: string;
    public_key: string;
    device_name: string;
}> {
    if (!window.PublicKeyCredential) {
        throw new Error('เบราว์เซอร์ไม่รองรับ WebAuthn / Passkeys');
    }

    const challengeBuffer = base64UrlToBuffer(options.challenge);
    const userIdBuffer = new TextEncoder().encode(String(options.user.id));

    const creationOptions: CredentialCreationOptions = {
        publicKey: {
            challenge: challengeBuffer,
            rp: {
                name: options.rp.name,
                id: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? undefined
                    : options.rp.id || window.location.hostname,
            },
            user: {
                id: userIdBuffer,
                name: options.user.name,
                displayName: options.user.displayName,
            },
            pubKeyCredParams: [
                { type: 'public-key', alg: -7 },   // ES256 (ECDSA P-256) - default on Apple & Android
                { type: 'public-key', alg: -257 }, // RS256 (RSA)
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform', // Native Apple / Android / Windows biometrics
                userVerification: 'required',
                residentKey: 'preferred',
            },
            timeout: 60000,
            attestation: 'none',
        },
    };

    const credential = (await navigator.credentials.create(creationOptions)) as PublicKeyCredential;
    if (!credential) {
        throw new Error('ไม่สามารถสร้างข้อมูลชีวมิติได้');
    }

    const rawId = bufferToBase64Url(credential.rawId);
    const response = credential.response as AuthenticatorAttestationResponse;

    // Convert SPKI public key to PEM if available
    let publicKeyPem = '';
    if (typeof response.getPublicKey === 'function') {
        const spkiBuffer = response.getPublicKey();
        if (spkiBuffer) {
            const base64Spki = btoa(String.fromCharCode(...new Uint8Array(spkiBuffer)));
            publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${base64Spki.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
        }
    }

    // Determine device label
    const platform = await isPlatformBiometricAvailable();

    return {
        credential_id: rawId,
        public_key: publicKeyPem,
        device_name: platform.label,
    };
}

/**
 * Authenticate with Apple Face ID / Android Biometrics (WebAuthn Assertion)
 */
export async function authenticateNativePasskey(options: {
    challenge: string;
    rpId?: string;
    allowCredentialId?: string;
}): Promise<{
    credential_id: string;
    client_data_json: string;
    authenticator_data: string;
    signature: string;
    user_handle?: string;
}> {
    if (!window.PublicKeyCredential) {
        throw new Error('เบราว์เซอร์ไม่รองรับ WebAuthn / Passkeys');
    }

    const challengeBuffer = base64UrlToBuffer(options.challenge);
    const rpId = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? undefined
        : options.rpId || window.location.hostname;

    const requestOptions: CredentialRequestOptions = {
        publicKey: {
            challenge: challengeBuffer,
            rpId,
            userVerification: 'required',
            timeout: 60000,
            allowCredentials: options.allowCredentialId
                ? [
                      {
                          type: 'public-key',
                          id: base64UrlToBuffer(options.allowCredentialId),
                          transports: ['internal'],
                      },
                  ]
                : undefined,
        },
    };

    const assertion = (await navigator.credentials.get(requestOptions)) as PublicKeyCredential;
    if (!assertion) {
        throw new Error('การยืนยันตัวตนด้วยฮาร์ดแวร์ชีวมิติถูกยกเลิก');
    }

    const response = assertion.response as AuthenticatorAssertionResponse;

    let userHandleStr: string | undefined = undefined;
    if (response.userHandle && response.userHandle.byteLength > 0) {
        userHandleStr = new TextDecoder().decode(response.userHandle);
    }

    return {
        credential_id: bufferToBase64Url(assertion.rawId),
        client_data_json: bufferToBase64Url(response.clientDataJSON),
        authenticator_data: bufferToBase64Url(response.authenticatorData),
        signature: bufferToBase64Url(response.signature),
        user_handle: userHandleStr,
    };
}

/**
 * Format biometric errors into helpful Thai messages
 */
export function formatBiometricError(err: any): string {
    if (!err) return 'เกิดข้อผิดพลาดในการยืนยันตัวตนด้วยชีวมิติ';

    const name = err.name || '';
    const msg = (err.message || '').toLowerCase();

    if (name === 'NotAllowedError') {
        return 'การสแกนลายนิ้วมือ/ใบหน้าถูกยกเลิก หรือไม่ได้วางนิ้วบนเซนเซอร์ กรุณาลองใหม่อีกครั้ง';
    }
    if (name === 'SecurityError') {
        return 'ระบบสแกนลายนิ้วมือ/ใบหน้าต้องใช้งานผ่านการเชื่อมต่อที่ปลอดภัย (HTTPS หรือ localhost)';
    }
    if (name === 'NotSupportedError') {
        return 'อุปกรณ์หรือเบราว์เซอร์นี้ยังไม่รองรับระบบสแกนลายนิ้วมือ/ใบหน้าแบบ WebAuthn';
    }
    if (name === 'InvalidStateError') {
        return 'อุปกรณ์นี้ได้ลงทะเบียนลายนิ้วมือ/ใบหน้านี้ไว้แล้ว';
    }
    if (msg.includes('user cancelled') || msg.includes('user aborted')) {
        return 'ผู้ใช้กดยกเลิกการสแกนลายนิ้วมือ/ใบหน้า';
    }

    return err.message || 'การสแกนลายนิ้วมือ/ใบหน้าไม่สำเร็จ';
}
