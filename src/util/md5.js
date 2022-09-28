import crypto from 'crypto';
export default class MD5HashAlgorithm {
    hash(input) {
        return crypto
            .createHash('MD5')
            .update(input)
            .digest('hex');
    }
}