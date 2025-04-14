const forge = require('node-forge');
const { Client, Storage } = require('node-appwrite');

/**
 * Generates a PFX certificate with secure parameters and uploads to Appwrite
 */
module.exports = async function (req, res) {
    try {
        const {
            commonName = 'DocPilot Certificate',
            countryName = 'US',
            stateOrProvinceName = 'State',
            localityName = 'City',
            organizationName = 'DocPilot',
            organizationalUnitName = 'Development',
            password = 'docpilot123',
            uid, // User/Doctor UID from request
            userName, // User's name for the certificate filename
            // Appwrite configuration
            appwriteEndpoint = process.env.APPWRITE_ENDPOINT,
            appwriteProjectId = process.env.APPWRITE_PROJECT_ID,
            appwriteApiKey = process.env.APPWRITE_API_KEY,
            bucketId = process.env.APPWRITE_BUCKET_ID
        } = req.body || {};

        // Validate UID and userName
        if (!uid) {
            return res.json({
                success: false,
                error: "User/Doctor UID is required"
            }, 400);
        }

        if (!userName) {
            return res.json({
                success: false,
                error: "User name is required for the certificate file"
            }, 400);
        }

        // Clean the userName to be safe for filenames
        const safeUserName = userName.replace(/[^a-zA-Z0-9]/g, '_');

        // Initialize Appwrite client
        const client = new Client();
        client
            .setEndpoint(appwriteEndpoint)
            .setProject(appwriteProjectId)
            .setKey(appwriteApiKey);

        const storage = new Storage(client);

        // Generate a new key pair with stronger key size
        const keys = forge.pki.rsa.generateKeyPair(4096);

        // Create a new certificate
        const cert = forge.pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

        // Set certificate attributes
        const attrs = [{
            name: 'commonName',
            value: commonName
        }, {
            name: 'countryName',
            value: countryName
        }, {
            name: 'stateOrProvinceName',
            value: stateOrProvinceName
        }, {
            name: 'localityName',
            value: localityName
        }, {
            name: 'organizationName',
            value: organizationName
        }, {
            name: 'organizationalUnitName',
            value: organizationalUnitName
        }];

        cert.setSubject(attrs);
        cert.setIssuer(attrs);

        // Set certificate extensions
        cert.setExtensions([{
            name: 'basicConstraints',
            cA: true
        }, {
            name: 'keyUsage',
            keyCertSign: true,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true
        }, {
            name: 'extKeyUsage',
            serverAuth: true,
            clientAuth: true,
            codeSigning: true,
            emailProtection: true,
            timeStamping: true
        }]);

        // Sign the certificate with the private key using SHA-256
        cert.sign(keys.privateKey, forge.md.sha256.create());

        // Create PKCS12 (PFX) with stronger encryption
        const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
            keys.privateKey,
            [cert],
            password,
            {
                algorithm: '3des', // Use 3DES for better compatibility
                friendlyName: commonName,
                generateLocalKeyId: true,
                saltSize: 8,
                iterations: 2048,
            }
        );

        // Convert to DER format with proper padding
        const pfxDer = forge.asn1.toDer(p12Asn1).getBytes();

        // Create file buffer directly from the binary data
        const fileBuffer = Buffer.from(pfxDer, 'binary');

        // Use only the user's name for the filename
        const filename = `${safeUserName}.pfx`;

        // Upload to Appwrite storage with custom ID based on UID
        const fileResponse = await storage.createFile(
            bucketId,
            uid, // Use the UID as the file ID
            fileBuffer,
            {
                filename,
                contentType: 'application/x-pkcs12',
                permissions: ['role:all'],
            }
        );

        // Generate file URL
        const fileUrl = `${appwriteEndpoint}/storage/buckets/${bucketId}/files/${fileResponse.$id}/view?project=${appwriteProjectId}`;

        // Return the certificate data
        return res.json({
            success: true,
            password: password,
            expiryDate: cert.validity.notAfter.toISOString(),
            fileId: fileResponse.$id,
            fileUrl: fileUrl,
            uid: uid
        });
    } catch (error) {
        console.error('Certificate generation failed:', error);
        return res.json({
            success: false,
            error: error.message
        }, 500);
    }
};