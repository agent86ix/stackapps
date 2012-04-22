var StackExchangeAPI = {

	common_args: {},
	client_id: -1,
	timer_id: null,
	request_queue: [],
	default_backoff: 1000,
	current_backoff: 0,

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

	_on_site_list_success: function (json) {
		if(!('items' in json)) {
			return;
		}
		
		var option_list = "";
		var site_array = "";
		for(var item_id in json.items) {
			var item = json.items[item_id];
			
			option_list = option_list + '<option value="'+item['api_site_parameter']+'">'+item['name']+'</option>\n';
			site_array = site_array + '"'+item['api_site_parameter']+'" :{name:"'+item['name']+
				'",api_site_parameter:"'+item['api_site_parameter']+
				'",site_url:"'+item['site_url']+
				'",icon_url:"'+item['icon_url']+'"},\n';
		}
		
		console.log(option_list);
		console.log(site_array);
		
	},

	fetch_site_list: function () {
		$.ajax({
			type: "GET",
			url: "http://api.stackexchange.com/2.0/sites?filter=!)qzjwE32lBgZf60JN0vg&pagesize=500", 
			success: StackExchangeAPI._on_site_list_success,
			dataType:"jsonp",
		});
	},
	
	build_site_select: function(site_list) {
		var output = "";
		for(var api_name in site_list) {
			var site = site_list[api_name];
			output = output + '<option value="'+api_name+'">'+site.name+'</option>';
		}
		return output;
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