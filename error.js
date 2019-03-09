class SimpleError extends Error {
    constructor(name, message) {
        super(message);
        this.name = name;
        this.message = message;

        Error.captureStackTrace(this, this.constructor);
    }
}

class FileNotExistError extends SimpleError {
    constructor(message) {
        super('FileNotExistError', message);
    }
}

module.exports = {
    FileNotExistError,
};