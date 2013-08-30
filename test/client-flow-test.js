var APIeasy = require('api-easy');
var assert = require('assert');

//*
var host = 'localhost';
var port = 5006;
/*/
var host = 'api.theprintlab.cl';
var port = 5008;
// */

var udid = 'this_is_a_test_device_identifier';
var client_id = '';
var address_id = '';

var suite = APIeasy.describe('API -> client');
suite.discuss('When registering a client')
.use(host, port)
.path('/v1')
.path('/client')
.setHeader('Content-Type', 'application/json')

//Client register
.post('/register', { udid: udid })
.expect(200)
.expect('should return Client', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/register  -> ' + JSON.stringify(body));
	assert.isNotNull(body.client._id, 'no client._id returned');
	client_id = body.client._id;
	
	suite.before('clientId-get', function(outgoing) {
		outgoing.uri = outgoing.uri.replace('CLIENT_ID', client_id);
		return outgoing;
	});
})
.next()

//Client get
.undiscuss()
.discuss('When getting a client')
.get('/get', {_id: 'CLIENT_ID'})
.expect(200)
.expect('should return Client', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/get -> ' + JSON.stringify(body));
	assert.equal(body.client._id, client_id, 'no client._id returned');
	suite.unbefore('clientId-get');
	suite.before('clientId-post', function(outgoing){
		outgoing.body = outgoing.body.replace('CLIENT_ID', client_id);
		return outgoing;
	});
})
.next()

//Client update
.undiscuss()
.discuss('When updating a client')
.put('/update', {client : {_id: 'CLIENT_ID', email: 'jmfluxa@gmail.com', mobile:'8618616972923'} })
.expect(200)
.expect('should return Client', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/update  -> ' + JSON.stringify(body));
	assert.equal(body.client._id, client_id, 'no client._id returned');
	
})
.next()

//Address1 register
.unpath()
.path('/address')
.undiscuss()
.discuss('When adding first address to a client')
.post('/register', {payload:{client_id:'CLIENT_ID',address:{name:'Juan',last_name:'Fluxa',address_line1:'Martin de Zamora 4965 d.75', address_line2:'', region:'Santiago', provincia:'Santiago', comuna:'Las Condes'}}})
.expect('should return newly created Address', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/address/register  -> ' + JSON.stringify(body));
	assert.isNotNull(body.address._id, 'did not return Address');
	address_id = body.address._id;
	
	suite.unbefore('clientId-post');
	suite.before('address-get',function(outgoing){
		outgoing.uri = outgoing.uri.replace('ADDRESS_ID',address_id);
		return outgoing;
	});
})
.next()

//Adress1 get
.undiscuss()
.discuss('When getting an Address')
.get('/get', {_id: 'ADDRESS_ID'})
.expect(200)
.expect('should return Address', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/address/get -> ' + JSON.stringify(body));
	assert.equal(body.address._id, address_id, 'no address._id returned');

	suite.unbefore('address-get');
	suite.before('clientId-post', function(outgoing){
		outgoing.body = outgoing.body.replace('CLIENT_ID',client_id);
		return outgoing;
	});
})
.next()

//Address2 register
.undiscuss()
.discuss('When adding second address to a client')
.post('/register', {payload:{client_id:'CLIENT_ID',address:{name:'MARÍA DE LA LUZ',last_name:'ROJAS',address_line1:'Calle de la Luna 456 d.21', address_line2:'', region:'Santiago', provincia:'Santiago', comuna:'Las Condes'}}})
.expect(200)
.expect('should return newly created Address', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/address/register -> ' + JSON.stringify(body));
	assert.isNotNull(body.address._id, 'did not return Address');

	suite.unbefore('clientId-post');
	suite.before('address-post',function(outgoing){
		outgoing.body = outgoing.body.replace('ADDRESS_ID',body.address._id);
		return outgoing;
	});
})
.next()

//Address2 remove
.undiscuss()
.discuss('When removing second address')
.del('/remove', {_id: 'ADDRESS_ID'})
.expect(200)
.expect('should return newly created Address', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/address/remove -> ' + JSON.stringify(body));
	assert.equal(body.success, true, 'response is not success');

	suite.unbefore('address-post');
	suite.before('clientId-get', function(outgoing){
		outgoing.uri = outgoing.uri.replace('CLIENT_ID',client_id);
		return outgoing;
	});
})
.next()

//Coupon get
.unpath()
.path('client')
.path('coupon')
.undiscuss()
.discuss('When getting available cupouns')
.get('/get', {_id:'CLIENT_ID'})
.expect(200)
.expect('should return Array of coupons', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/client/coupon/get -> ' + JSON.stringify(body));
	assert.equal((body.coupons.length > 0), true, 'did not return Array');

	suite.unbefore('clientId-get');
	suite.before('coupon-post', function(outgoing){
		outgoing.body = outgoing.body.replace('CLIENT_ID',client_id);
		outgoing.body = outgoing.body.replace('COUPON_ID',body.coupons[0].code);
		return outgoing;
	});
})
.next()

//Coupon consume
.undiscuss()
.discuss('When consuming a cupon')
.post('/consume', {payload:{client_id:'CLIENT_ID',coupon_id:'COUPON_ID'}})
.expect(200)
.expect('should return updated Client', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/client/coupon/consume  -> ' + JSON.stringify(body));
	assert.equal(body.client._id, client_id, 'did not return Client');
	
})
.next()

//Coupon consume TWICE
.undiscuss()
.discuss('When consuming the same cupon again')
.post('/consume', {payload:{client_id:'CLIENT_ID',coupon_id:'COUPON_ID'}})
.expect(400)
.expect('should return error', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/client/coupon/consume error -> ' + JSON.stringify(body));
	
	suite.unbefore('coupon-post');
	suite.before('client-post', function(outgoing){
		outgoing.body = outgoing.body.replace('CLIENT_ID',client_id);
		outgoing.body = outgoing.body.replace('ADDRESS_ID',address_id);
		return outgoing;
	});
})
.next()

// Create Order
.unpath()
.unpath()
.path('/order')
.undiscuss()
.discuss('When creating an Order')
.post('/create', {
	order: {
		client_id: 'CLIENT_ID',
		shipping_address_id:'ADDRESS_ID',
		photo_count: 3,
		cost_printing: 5000,
		cost_shipping: 2500,
		cost_total: 7500,
		gift: {
			is_gift: true,
			message: 'hello there!'
		},
		verbose: 'This order is for client Juan Fluxa shipping to Martin de Zamora'
	}	
})
.expect(200)
.expect('should reply with Address', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/order/create  -> ' + JSON.stringify(body));
	assert.isNotNull(body.order._id, 'response is not success');

	// suite.before('clientId-post', function(outgoing){
	// 	outgoing.body = outgoing.body.replace('CLIENT_ID',body.order.client_id);
	// 	return outgoing;
	// });
	
})
.next()

//Client delete
.unpath()
.path('/client')
.undiscuss()
.discuss('When removing a client')
.del('/remove', {_id:'CLIENT_ID'})
.expect(200)
.expect('should reply with success', function (err, res, body) {
	var body = JSON.parse(body);
	console.log('/client/remove  -> ' + JSON.stringify(body));
	assert.equal(body.success, true, 'response is not success');
})
.export(module);
