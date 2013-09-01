'use strict';

/* Services */

// converting mongo _id into Date
String.prototype.getTimestamp = function() {
    return new Date(parseInt(this.slice(0,8), 16)*1000);
}

String.prototype.datePretty = function() {
	var d = this.getTimestamp();
	return moment(d).format('lll');
}

angular.module('myApp.services', [])
	.factory('api', function($http) {
		return {
			clientAll: function(){
				return $http.post('/v1/clients/find',{query:{}}).then(function(result){
					return result.data;
				});
			},
			orderAll: function() {
				return $http.get('/v1/orders/all').then(function(result){
					return result.data;
				});
			},
			orderDelete: function(orderId) {
				return $http.delete('/v1/orders/remove/'+orderId).then(function(result) {
					return result.data;
				});
			},
			orderStatusList: function() {
				return $http.get('/v1/orders/status_list').then(function(result){
					return result.data;
				});
			},
			appLogs: function() {
				return $http.get('/v1/logs').then(function(result){
					return result.data;
				});
			}
		}
	});

