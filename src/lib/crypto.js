import bcryptjs from "bcryptjs";

export const encryptPassword = async function(password) {
    try {
        const salt = await bcryptjs.genSalt(10);
        return await bcryptjs.hash(password, salt);
    } catch (error) {
        console.error("Error encrypting password:", error);
        throw new Error("Encryption failed");
    }
};

export const matchPassword = async function(password, savedPassword) {
    try {
        return await bcryptjs.compare(password, savedPassword);
    } catch (error) {
        console.error("Error comparing passwords:", error);
        throw new Error("Comparison failed");
    }
};

export const encryptData = async function(data, nonce) {
    try {
        const salt = await bcryptjs.genSalt(nonce);
        return await bcryptjs.hash(data, salt);
    } catch (error) {
        console.error("Error encrypting data:", error);
        throw new Error("Encryption failed");
    }
};