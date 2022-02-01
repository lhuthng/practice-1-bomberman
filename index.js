const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(port, () => {
    console.log(`Application has started on port ${port}`);
});