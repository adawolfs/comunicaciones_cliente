var express = require('express');
var router = express.Router();
var btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

var SocketClient = require('socket.io-client');
var socket;
var localSocket;

var username = "";
var serialAddress = "00:00:00:00:00:00";

var connected = false;
var serverConnected = false;

module.exports = function(io) {

    btSerial.on('found', function(address, name) {
        console.log('Found: ' + address + ' with name ' + name);

        btSerial.findSerialPortChannel(address, function(channel) {
            console.log('Found RFCOMM channel for serial port on ' + name + ': ' + channel);

            if (address !== serialAddress)  return;

            console.log('Attempting to connect...');

            btSerial.connect(address, channel, function() {
                console.log('Bluetooth connected');
                connected = true;
                if(!serverConnected)
                    connectSocket('http://localhost:3001');
            }, function () {
                console.log('cannot connect');
            });

        }, function() {
            console.log('found nothing');
        });
    });

    function writeBluetooth(data){
        btSerial.write(new Buffer(data, 'utf-8'), function(err, bytesWritten) {
            if (err) console.log(err);
        });
    }

    btSerial.on('data', function(buffer) {
        var value = buffer.toString('utf-8');
        console.log(value);
        if(value === "x"){
            socket.emit('error', 'error');
        }
    });

    /*********** Connection with server ***********/

    function connectSocket(address){
        socket = new SocketClient(address);
        socket.on('connect', function(socket) {
            console.log('Connected!');
            serverConnected = true;
        });

        socket.on('username', function(msg){
            console.log('username: ' + msg);
            sendLocalSocket('username', msg)
            username = msg
        });

        socket.on('start', function(data){
            console.log("start");
            writeBluetooth('x')
        });

        socket.on('stop', function(data){
            writeBluetooth('s')
        });
    }

    function writeToServer(route, data){
        socket.emit(route, data);
    }

    /*********** Connection with server ***********/


    /*********** Connection with local socket ***********/

    io.on('connection', function(socket){
        localSocket = socket;
        console.log(socket.id)
        console.log('Local socket Connected!');
    });

    function sendLocalSocket(action, data){
        console.log(action);
        localSocket.emit('username', data);
    }

    /*********** Connection with local socket ***********/


    router.get('/', function(req, res, next) {
        res.render('index', { title: 'Express', username: username});
    });

    router.post('/connectBluetooth', function(req, res, next) {
        serialAddress = req.body.address;
        btSerial.inquire();
        res.send(serialAddress);
    });

    router.post('/connectServer', function(req, res, next) {
        var socketAddress = req.body.address;
        connectSocket(socketAddress);
        res.send(socketAddress);
    });

    return router;
};
