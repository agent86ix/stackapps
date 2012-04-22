var StackExchangeAPI = {

	common_args: {},
	client_id: -1,
	timer_id: null,
	request_queue: [],
	default_backoff: 1000,
	current_backoff: 0,
	site_list: {},

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
		
		$.ajax({
			type: "GET",
			url: "https://api.stackexchange.com/2.0/"+request[0], 
			data: request[1], 
			success: function(json) { 
				if('backoff' in json)
					StackExchangeAPI.current_backoff = json.backoff*1000;
				else
					StackExchangeAPI.current_backoff = StackExchangeAPI.default_backoff;
				request[2](json);
			}, 
			dataType:"jsonp",
			error: request[3]
		});
		
		StackExchangeAPI.timer_id = setTimeout( 
			function () {StackExchangeAPI._process_api_call()}, 
			StackExchangeAPI.current_backoff );
		
		
	},
	
	populate_site_select: function(select_id) {
		var option_list = "";
		
		for(var site_id in StackExchangeAPI.site_list) {
			var item = StackExchangeAPI.site_list[site_id];
			option_list = option_list + '<option value="'+site_id+'">'+item['name']+'</option>\n';
		}
		
		$(select_id).html(option_list);
	},
	
	_on_site_list_success: function(json) {
		if(!('items' in json)) {
			return;
		}
		
		var site_list = {}
		
		for(var item_id in json.items) {
			var item = json.items[item_id];
			
			site_list[item['api_site_parameter']] = {
				name:item['name'],
				site_url:item['site_url'],
			};
		}
		
		StackExchangeAPI.site_list = site_list;
	},
	
	_build_site_list: function() {
		$.ajax({
			type: "GET",
			url: "http://a86seapi.appspot.com/sites",
			success: function (json) {
				StackExchangeAPI._on_site_list_success(json);
			},
			dataType: "json",
		});
	},

	call: function (api_call, args, on_success, on_error) {
		var api_args = $.extend({}, StackExchangeAPI.common_args, args);
		StackExchangeAPI.request_queue.push([api_call, api_args, on_success, on_error]);
		
		if(StackExchangeAPI.timer_id == null) {
			StackExchangeAPI.timer_id = setTimeout ( 
				function () {StackExchangeAPI._process_api_call()}, 
				100 );
		}
	
	},

	abort_queue: function () {
		api_request_queue = [];
	},

	init: function (new_client_id, client_common_args) {
		StackExchangeAPI.current_backoff = StackExchangeAPI.default_backoff;
		StackExchangeAPI.client_id = new_client_id;
		$.extend(StackExchangeAPI.common_args, client_common_args);
		StackExchangeAPI._build_site_list();
	},

	auth: function (cur_site, on_success, on_error) {
		StackExchangeAPI._get_access_token(StackExchangeAPI.client_id);
		
		StackExchangeAPI.call('/me', {site:cur_site}, function(json) {
			if(!("items" in json)) {
				on_error(null, null, null);
			} else {
				on_success(json);
			}
		}, on_error); 
	}
	
	
	
};