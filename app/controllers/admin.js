/*!
 * Module dependencies.
 */

var mongoose = require('mongoose')
var Order = mongoose.model('Order');
var Client = mongoose.model('Client');
var Support = mongoose.model('Support');
var Coupon = mongoose.model('Coupon');
var Policy = mongoose.model('Policy');
var async = require('async');
var _ = require('underscore');
var moment = require('moment');
var util = require('util');
var csv = require('csv');

/* 
* Routes
*/

exports.dashboard = function(req, res) {

	var orders = [];
	var clients = [];

	async.series([
		// Get all Orders
		function(callback) {
			Order.find({})
			.exec(function(err, docs) {
				if(!err && docs) {
					orders = docs;
				}
				callback(null, 'orders');
			})
		},
		//Get all Clients
		function(callback) {
			Client.find({})
			.exec(function(err, docs) {
				if(!err && docs) {
					clients = docs;
				}
				callback(null, 'clients');
			})
		}
	], function(err, results) {
		res.render('dashboard', {orders: orders, clients: clients, ostatus: Order.OrderStatus});
	});
}

exports.orders = function(req, res) {

	var orders = [];

	async.series([

		// Get All Orders
		function(callback) {

			Order.find({})
			.sort({_id: -1})
			.populate('address')
			.populate('client')
			.exec(function(err, docs) {
				if(!err && docs) {
					orders = docs;
				}
				callback(null, 'orders');
			});
		}

	// Finish
	], function(err, results) {
		res.render('orders', {orders: orders, getTimestamp: getTimestamp, toPrettyDate: toPrettyDate});
	});
}

exports.clients = function(req, res) {
	var clients = [];

	async.series([
		//Get all
		function(callback) {
			Client.find({})
			.sort({_id: -1})
			.populate('addresses')
			.exec(function(err, docs) {
				if (!err && docs) {
					clients = docs;
				};
				callback(null, 'clients');
			});
		}
	// Finish
	], function(err, results) {
		res.render('clients', {clients: clients});
	});
}

/**
 * Manage a group of Orders base on the action parameter
 *
 * @param [String] order_ids Array of Order _id
 * @param {String} action
 * @return {String} 200 OK | 400 Error
 * @api private
 */
exports.orders_manage = function (req, res) {

	var order_ids = req.body.order_ids;
	var action = req.body.action;
	var count_orders_modified = 0;
	
	if (order_ids && action) {

		Order.find({
			_id: {
				$in: order_ids
			}
		})
		.exec(function(err, docs) {

			if (!err && docs) {
				
				async.eachSeries(docs, function(order, callback) {
					
					var modified = false;
					var finish = function() {
						callback(null);
					}
					
					switch(action) {

						case 'printing':
							order.status = Order.OrderStatus.Printing;
							modified = true;
							break;
						
						case 'shipped':
							order.status = Order.OrderStatus.Shipped;
							modified = true;
							break;
						
						case 'delete':
							finish = function(){};
							order.remove(function(err, removed) {
								count_orders_modified++;
								callback(null);
							});
							break;
					}

					if(modified) {
						order.save(function(err, saved) {
							count_orders_modified++;
							finish();
							if(err) {
								console.log('Error saving Order in change_status => ' + err);	
							}
						});
					} else {
						finish();
					}
				},
				// Finish
				function(err) {
					req.flash('success', util.format('%d Orders has been modified',count_orders_modified));
					res.redirect('/admin/orders');
				});

			} else {
				req.flash('errors', err || util.format('Order change_status -> not found for ids: %s',order_ids));
				res.redirect('/admin/orders');
			}
		});
	} else {
		req.flash('errors', 'Missing parameters order_ids, action');
		res.redirect('/admin/orders');
	}
}

exports.orders_export = function(req, res) {

	var rows = [];
	var header = [
		'Date',
		'OrderID',
		'Status',
		'Photos',
		'Total',
		'Cost Printing',
		'Cost Shipping',
		'Coupon',
		'ClientID',
		'Email',
		'Phone',
		'To',
		'Address',
		'Region',
		'Provincia',
		'Comuna',
		'Gift Message'
	];
	rows.push(header);

	var order_ids = req.body.order_ids;
	
	if (order_ids) {

		Order.find({
			_id: {
				$in: order_ids
			}
		})
		.sort({_id: -1})
		.populate('address')
		.populate('client')
		.exec(function(err, docs) {
			
			if(!err && docs) {
				_.each(docs, function(order, index, all) {
					var row = [];
					var m = new moment(getTimestamp(order._id));
					row.push(m.format('YYYY-MM-DD HH:mm'));
					row.push(order._id.toString());
					row.push(order.status);
					row.push(order.photo_count);
					row.push(order.cost_total);
					row.push(order.cost_printing);
					row.push(order.cost_shipping);
					row.push(order.coupon_code);
					row.push(order.client._id.toString());
					row.push(order.client.email);
					row.push(order.client.mobile);
					row.push(util.format('%s %s',order.address.name,order.address.last_name));
					row.push(util.format('%s %s',order.address.address_line1,order.address.address_line2));
					row.push(order.address.region);
					row.push(order.address.provincia);
					row.push(order.address.comuna);
					row.push(order.gift ? order.gift.message : '');
					rows.push(row);
				});
			}
			// Create CSV
			csv()
			.from.array(rows)
			.to(function(data) {
				//console.log(data);
				var m = new moment();
				var filename = util.format('%s-ThePrintlabOrders.csv',m.format('YYYY-MM-DD'));
				res.setHeader('Content-disposition', 'attachment; filename='+filename);
				res.setHeader('Content-type', 'text/plain');
				res.charset = 'UTF-8';
				res.write(data);
				res.end();
			})
			// .on('record', function(row,index){
			// 	console.log('#'+index+' '+JSON.stringify(row));
			// })
			// .on('end', function(count){
			// 	console.log('Number of lines: '+count);
			// })
			// .on('error', function(error){
			// 	console.log(error.message);
			// });

		});

	} else {
		req.flash('errors', 'Missing parameters order_ids');
		res.redirect('/admin/orders');
	}
	
}

// Coupons
exports.coupons = function(req, res) {

	var coupons = [];

	async.series([
		// Get All
		function(callback) {
			Coupon.find({})
			.exec(function(err, docs) {
				if(!err && docs) {
					coupons = docs;
				}
				callback(null, 'coupons');
			});
		}
	],
	// Finally
	function(err, results) {
		res.render('coupons', {
			coupons: coupons
		});
	});
}

exports.coupons_add = function(req, res) {

	var coupon = req.body.coupon || {};

	if(coupon.title && coupon.description && coupon.rules) {

		var c = new Coupon(coupon);
		c.save(function(err, saved) {
			if(!err) {
				req.flash('success', 'New Coupon Saved!');
			} else {
				req.flash('errors', err ? JSON.stringify(err) : 'Error trying to save coupon, please try again.');
			}
			res.redirect('admin/coupons');
		});
	} else {
		req.flash('errors', 'Missing parameters');
		res.redirect('admin/coupons');
	}

}

// Coupons
exports.policies = function(req, res) {

	var policies = [];
	var coupons = [];
	var clients = [];

	async.series([

		// Get All Policies
		function(callback) {
			Policy.find({})
			.populate('coupon')
			.exec(function(err, docs) {
				if(!err && docs) {
					policies = docs;
				}
				callback(null, 'policies');
			});
		},

		// Get all Coupons
		function(callback) {
			Coupon.find({})
			.exec(function(err, docs) {
				if(!err && docs) {
					coupons = docs;
				}
				callback(null, 'coupons');
			});
		},

		// Get all Clients
		function(callback) {
			Client.find({})
			.exec(function(err, docs){
				if(!err && docs){
					clients = docs;
				}
				callback(null, 'clients');
			})
		}

	],
	// Finally
	function(err, results) {
		res.render('policies', {
			policies: policies,
			coupons: coupons,
			clients: clients
		});
	});
}

exports.policies_add = function(req, res) {

	var policy = req.body.policy || {};

	if(policy.name && policy.type && policy.coupon && policy.expiry_date) {

		// Validations
		var valid = true;
		var errors = [];
		
		if(policy.type === Policy.Types.Specific && !policy.target_clients) {
			valid = false;
			errors.push('Must select at least 1 Client for SPECIFIC policy type');
		}

		if(policy.type === Policy.Types.Global) {
			policy.target_clients = [];
		}

		policy.active = policy.active ? true : false;

		if(policy.never_expires) {
			policy.expiry_date = '2999-01-01';
		}

		var now = moment().utc().format('YYYY-MM-DD');
		if(policy.expiry_date < now) {
			valid = false;
			errors.push('Expiry Date should be in the future');
		}

		if(valid) {
			var p = new Policy(policy);
			p.save(function(err, saved) {
				if(!err) {
					req.flash('success', 'New Policy Saved!');
				} else {
					req.flash('errors', err ? JSON.stringify(err) : 'Error trying to save policy, please try again.');
				}
				res.redirect('admin/policies');
			});
		} else {
			req.flash('errors', errors);
			res.redirect('admin/policies');
		}
	} else {
		req.flash('errors', 'Missing parameters');
		res.redirect('admin/policies');
	}
}

exports.policies_active = function(req, res) {
	
	var policy = req.body.policy;
	if(policy._id && policy.active != null) {
		Policy.findOne({_id: policy._id})
		.exec(function(err, doc) {
			if(!err) {
				doc.active = policy.active === 'true' ? true : false;
				doc.save(function(err, saved) {
					res.send({success: err ? false : true, policy: saved});
				});
			} else {
				res.send({success: false, policy: policy});
			}
		});
	} else {
		res.send({success:false, policy: policy});
	}
	
}

// Support
exports.support = function(req, res) {

	var supports = [];

	Support.find({})
	.sort({_id: -1})
	.populate('client')
	.exec(function(err, docs) {
		if(!err && docs){
			supports = docs;
		}
		res.render('support', {supports: supports, getTimestamp: getTimestamp, toPrettyDate: toPrettyDate});
	});
}

exports.support_close = function(req, res) {
	var support_ids = [req.body.support_id];
	if(support_ids) {
		Support.update({
			_id: {
				$in: support_ids
			}
		},
		{
			$set:{
				status: Support.Status.Closed
			}
		},
		{
			multiple: true
		})
		.exec(function(err, docs) {

			if(err) {
				res.send({success: false, error: err});
			} else {
				res.send({success: true});
			}
			
		});
	} else {
		res.send({succcess: false, error: 'Missing parameters'});
	}
}

/*
* Utils
*/
function getTimestamp(_id) {
	var timehex = String(_id).substring(0,8);
	var secondsSinceEpoch = parseInt(timehex, 16);
	return (secondsSinceEpoch*1000);
}

function toPrettyDate(_id) {
	var timestamp = getTimestamp(_id);
	return new moment(timestamp).format('YYYY-MM-DD HH:mm');
}
