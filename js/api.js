var StackExchangeAPI = {

	common_args: {},
	client_id: -1,
	timer_id: null,
	request_queue: [],
	default_backoff: 100,
	current_backoff: 0,
	site_list: {},
	site_list_ready: 0,
	init_complete: null,
	call_status: 0,

	_get_access_token: function (client_id) {
		var bits = window.location.href.split('#');
		var fragment = bits[1];
		var obj = {};
		
		if (fragment){
		
			// parse fragment into k=v pairs
			
			var pairs = fragment.split('&');
			for (var i=0; i<pairs.length; i++){
				var pair = pairs[i].split('=');
				var k = decodeURIComponent(pair[0]);
				var v = decodeURIComponent(pair[1]);
				obj[k] = v;
			}
		}
		
		if (obj.access_token){
			$.extend(StackExchangeAPI.common_args, {'access_token': obj.access_token});
		} else {
			var redirect_url = encodeURI(bits[0]);
			url = "https://stackexchange.com/oauth/dialog?client_id="+client_id+
				"&redirect_uri="+redirect_url;
			window.location = url;
		}
		
	},

	reset_access_token: function (client_id) {
		var bits = window.location.href.split('#');
		var redirect_url = encodeURI(bits[0]);
		url = "https://stackexchange.com/oauth/dialog?client_id="+client_id+
			"&redirect_uri="+redirect_url;
		window.location = url;
	},

	revoke_access: function () {
		if('access_token' in api_common_args) {
			$.ajax({
				type: "GET",
				url: "https://api.stackexchange.com/2.0/apps/"
					+encodeURI(StackExchangeAPI.common_args['access_token'])+"/de-authenticate", 
				data: StackExchangeAPI.common_args,
				dataType:"html",
			});
		}
	},

	_process_api_call: function () {
		var request = StackExchangeAPI.request_queue.shift()
		if(request == null) {
			StackExchangeAPI.timer_id = null;
			return;
		}
		
		if(window.console) window.console.log("Dequeued new call ("+
			StackExchangeAPI.request_queue.length+" remain) "+request[0]);
		
		StackExchangeAPI.call_status = 1;
		$.ajax({
			type: "GET",
			url: "https://api.stackexchange.com/2.0/"+request[0], 
			data: request[1], 
			success: function(json) { 
				if(window.console) window.console.log("Call complete to endpoint "+request[0]);
				if('backoff' in json)
					StackExchangeAPI.current_backoff = json.backoff*1100;
				else
					StackExchangeAPI.current_backoff = StackExchangeAPI.default_backoff;
				StackExchangeAPI.timer_id = setTimeout( 
					function () {StackExchangeAPI._process_api_call()}, 
					StackExchangeAPI.current_backoff );
				if(StackExchangeAPI.call_status != 2) {
					request[2](json);
				} 
				StackExchangeAPI.call_status = 0;
			}, 
			dataType:"jsonp",
			error: request[3]
		});
		

		
		
	},
	
	_populate_site_select: function(select_id, default_val) {
		var option_list = "";
		
		for(var site_id in StackExchangeAPI.site_list) {
			var item = StackExchangeAPI.site_list[site_id];
			option_list = option_list + '<option value="'+site_id+'">'+item['name']+'</option>\n';
		}
		
		$(select_id).html(option_list);
		$(select_id).val(default_val);
	},
	
	populate_site_select: function(select_id, default_val) {
		StackExchangeAPI.init_complete.done(function() {
			StackExchangeAPI._populate_site_select(select_id, default_val)
		});
	},
	
	_on_site_list_success: function(json) {
		if(!('items' in json)) {
			return;
		}
		
		StackExchangeAPI.site_list = {}
		
		for(var item_id in json.items) {
			var item = json.items[item_id];
			if(!('api_site_parameter' in item)){
				window.console.log("Weird!");
				break;
			}
			StackExchangeAPI.site_list[item['api_site_parameter']] = {
				name:item['name'],
				site_url:item['site_url'],
			};
		}
		
		StackExchangeAPI.init_complete.resolve();
	},
	
	_build_site_list: function() {
		$.ajax({
			type: "GET",
			//url: "http://a86seapi.appspot.com/sites",
			url:"http://api.stackexchange.com/2.1/sites?pagesize=1000",
			success: function (json) {
				StackExchangeAPI._on_site_list_success(json);
			},
			dataType: "json",
		});
	},

	call: function (api_call, args, on_success, on_error) {
		if(window.console) window.console.log("New API call enqueued to endpoint "+api_call+" ("+
			StackExchangeAPI.request_queue.length+" calls already in queue)"); 
			
		var api_args = $.extend({}, StackExchangeAPI.common_args, args);
		StackExchangeAPI.request_queue.push([api_call, api_args, on_success, on_error]);
		
		if(StackExchangeAPI.timer_id == null) {
			StackExchangeAPI.timer_id = setTimeout ( 
				function () {StackExchangeAPI._process_api_call()}, 
				StackExchangeAPI.current_backoff );
		}
	
	}, 

	abort_queue: function () {
		if(window.console) window.console.log("** Aborting queue!");
		StackExchangeAPI.request_queue = [];
		if(StackExchangeAPI.call_status) StackExchangeAPI.call_status = 2;
	},

	init: function (new_client_id, client_common_args) {
		StackExchangeAPI.current_backoff = StackExchangeAPI.default_backoff;
		StackExchangeAPI.client_id = new_client_id;
		$.extend(StackExchangeAPI.common_args, client_common_args);
		
		StackExchangeAPI.init_complete = $.Deferred();
		StackExchangeAPI._build_site_list();
	},

	
	
	_auth: function(cur_site, on_success, on_error) {
		
		StackExchangeAPI._get_access_token(StackExchangeAPI.client_id);
		
		StackExchangeAPI.call('/me', {site:cur_site}, function(json) {
			if(!("items" in json)) {
				on_error(null, null, null);
			} else {
				on_success(json);
			}
		}, on_error); 
	},
	
	auth: function (cur_site, on_success, on_error) {
		
		StackExchangeAPI.init_complete.done(function() {
			StackExchangeAPI._auth(cur_site, on_success, on_error)
		});

	}
	
	
	
};
