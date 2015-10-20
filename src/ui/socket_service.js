import io from 'socket.io-client';

/*@ngInject*/
class SocketService {
	constructor($rootScope) {
		this.$rootScope = $rootScope;
	}

	connect($scope) {
		if (!$scope) { $scope = this.$rootScope.$new; }
		return new Socket($scope);
	}
}

function Socket($scope) {
	var prefix = 'socket_';

	this.$scope = $scope;

	var socket = this._socket = io(undefined, {multiplex: false});

	$scope.$on('$destroy', function() {
		socket.close();
	});

	var events = ['connect', 'connect_error', 'connect_timeout', 'disconnect', 'error', 'reconnect', 'reconnect_attempt', 'reconnect_failed', 'reconnect_error', 'reconnecting'];
	events.forEach(function(name) {
		socket.on(name, function() {
			//console.log(prefix + name, arguments);
			$scope.$emit(prefix + name, arguments);
		});
	});

	var onevent = socket.onevent;
	socket.onevent = function(msg) {
		onevent.apply(socket, arguments);
		//console.log(prefix + msg.data[0], msg.data[1]);
		$scope.$emit(prefix + msg.data[0], msg.data[1]);
	};

	socket.on('reconnecting', function(attempts) {
		$scope.$apply(function() {
			$scope[prefix + 'state'] = 'reconnecting';
		});
	});
	socket.on('reconnect_error', function(err) {
		$scope.$apply(function() {
			$scope[prefix + 'state'] = 'error';
		});
	});
	socket.on('connect', function() {
		$scope.$apply(function() {
			$scope[prefix + 'state'] = 'connected';
		});
	});
	socket.on('error', function(err) {
		$scope.$apply(function() {
			$scope[prefix + 'state'] = 'error';
		});
	});
}

Socket.prototype.emit = function() {
	this._socket.emit.apply(this._socket, arguments);
};

export default SocketService;
