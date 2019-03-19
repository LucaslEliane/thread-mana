class CustomError extends Error {
    constructor(name, message) {
        super(message);
        this.name = name;
        this.message = message;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ParameterError extends CustomError {
    constructor(message) {
        super('ParameterError', message);
    }
}

class ThreadError extends CustomError {
    constructor(message) {
        super('ThreadError', message);
    }
}

module.exports = {
    ParameterError,
    ThreadError,
};