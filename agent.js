const http = require('http');

http.createServer((req, res) => {
});

http.listen(3000, () => {
    console.log('agent thread listening in port 3000');
})