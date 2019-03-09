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

class ThreadError extends SimpleError {
    constructor(message) {
        super('ThreadError', message);
    }
}

module.exports = {
    FileNotExistError,
    ThreadError,
};