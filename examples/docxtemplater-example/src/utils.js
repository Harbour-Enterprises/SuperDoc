// simple promisified delay function
export const sleep = async (time) => new Promise((resolve) => setTimeout(resolve, time));

export const base64ToDocx = (base64String, filename) => {
    try {
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        return file;
    } catch (error) {
        console.error('Error converting base64 to DOCX:', error);
    }
}