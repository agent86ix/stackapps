// ==UserScript==
// @name         SE ChatterBox
// @description  Shows a button to view your StackExchange inbox while you're in chat.
// @include      http://chat.meta.stackoverflow.com/rooms/*
// @include      http://chat.stackexchange.com/rooms/*
// @include      http://chat.stackoverflow.com/rooms/*
// @include      http://chat.askubuntu.com/rooms/*
// @author       @agent86
// @version      3.2
// ==/UserScript==




function inject() {
	for (var i = 0; i < arguments.length; ++i) {
		if (typeof(arguments[i]) == 'function') {
			var script = document.createElement('script');

			script.type = 'text/javascript';
			/* This maintains compat. in case there are multiple script frameworks
			   loaded.  The function will be called with jQuery as an argument, which
			   will create a local variable "$" in the function's scope. */
			script.textContent = '(' + arguments[i].toString() + ')(jQuery)';

			document.body.appendChild(script);
		}
	}
}

// Call the injection function, with our code.  This is wrapped in an anon. function
// so that it doesn't conflict with other items in the page, and $ is passed as a parameter
// to keep our dependency on jQuery's $ shortcut working.
inject(function ($) {

	var StackExchangeChatInbox = {
		
		access_token: null,
		timer_id: null,
		clear_unread: false,
		
		inbox_item_types: { 
			"comment":"Comment on",
			"chat_message":"Chat Message on",
			"new_answer":"Answer on",
			"careers_message":"Careers message:",
			"careers_invitations":"Careers Invitation:",
			"meta_question":"Meta Question:",
			"multiple":"Multiple updates on"
		},

		
		inbox_error: function () {
			$("#seci_inbox_container").html("A serious error occurred :(");
		},
		
		inbox_result: function (json) {
			if(!('items' in json)) {
				$("#seci_inbox_container").html("An API error occurred - is your access token still valid?");
				return;
			}
			
			var output_list = [];
			var output_link_list = []
			var unread_item_count = 0;
			var output_obj = {}
			
			for(var item_id in json.items) {
				var item = json.items[item_id];
				if(item.link in output_obj) {
					output_obj[item.link].type = "multiple";
				} else {
					var site_icon = "http://stackexchange.com/favicon.ico";
					if('site' in item) {
						if('favicon_url' in item['site']) {
							site_icon = item['site']['favicon_url']
						}
					}
					
					output_obj[item.link] = {item_type:item.item_type, 
						is_unread:item.is_unread, title:item.title,
						icon:site_icon, body:item.body};
					output_link_list.push(item.link);
				}
			}
			
			for(var item_id in output_link_list) {
				var item_link = output_link_list[item_id];
				var item = output_obj[item_link];
				var item_fresh = '';
				var item_type = item.item_type;
				
				if(item_type in StackExchangeChatInbox.inbox_item_types) {
					item_type = StackExchangeChatInbox.inbox_item_types[item_type];
				}
				if(item.is_unread) {
					unread_item_count++;
					item_fresh = '<span class="seci_new_item">NEW</span> ';
				}	
				//<p class="inboxSummary">'+item.body+'[...]</p>				
				output_list.push('<div class="itemBox">'+
					'<a href="'+item_link+'" class="siteLinkFavicon"><img src="'+item.icon+'"></a>'+
					'<div class="siteInfo"><p><b>' + item_fresh + item_type + '</b>: '+
					'<a href="'+ item_link + '" _target="blank">' + item.title + '</a></p>'+
					'<p>'+item.body+'</p>'+
					'</div></div>');
			}
			
			if(output_list.length == 0) {
				$("#seci_inbox_container").html("No items in your inbox...");
			} else {			
				$("#seci_inbox_container").html(output_list.join(''));
			}
			
			$("#seci_inbox_toggle").html("Inbox ("+unread_item_count+")");
			
			StackExchangeChatInbox.timer_id = setTimeout ( function() {StackExchangeChatInbox.update();}, 60*1000 );
			
		},
		
		fetch_inbox_url: function () {
			$.ajax({
				type: "GET",
				url: "http://stackexchange.com/inbox/genuwine", 
				success: function (json) {},
				error: function () {},
				dataType:"jsonp"			
			});
		
		
		},
		
		update: function() {
			//$("#seci_inbox_popup").html("Update in progress...");
			$.ajax({
				type: "GET",
				url: "https://api.stackexchange.com/2.0/inbox/", 
				data: {access_token:StackExchangeChatInbox.access_token, 
						filter:encodeURI('!)qvUQKLnHWDF8ZR97hd-'), 
						key:encodeURI('oBhIoUA)i7UXiHOFqgMaPw(('),
						page_size:10
				},
				success: function (json) {StackExchangeChatInbox.inbox_result(json)},
				error: function (json) {StackExchangeChatInbox.inbox_error(json)},
				dataType:"jsonp"			
			});
		
			
		},
		
		checkToken: function() {
			if(StackExchangeChatInbox.timer_id == null && StackExchangeChatInbox.access_token != null && StackExchangeChatInbox.access_token != "") {
				StackExchangeChatInbox.update();
			} else if(StackExchangeChatInbox.access_token == null || StackExchangeChatInbox.access_token == "") {
				$("#seci_inbox_container").html("No access token, please check the configuration.");
			}
		},
		
		init: function () {

			var style = 
				'#seci_inbox_popup{display:none;border:1px solid black;background-color:white;color:black;width:460px;padding: 5px;}'+
				'#seci_inbox_popup > a {color:black;}'+
				'#seci_inbox_container{vertical-align:bottom;max-height:300px;height:300px; overflow-y:auto;}'+
				'#seci_cfg_container{vertical-align:bottom;max-height:300px;height:300px; overflow-y:auto;}'+
				'#seci_inbox_container .itemBox{border-bottom:1px solid #F3F3F3;float:left;margin:3px 3px 0;padding:3px 4px;width:400px;}'+
				'#seci_inbox_container .siteInfo{font-size:11px;color:#888;margin-left:24px}'+ //float:left;
				'#seci_inbox_container .siteInfo a{font-size:11px;text-decoration:none;font-weight:bold;color:#444;}'+
				'#seci_inbox_container .siteInfo p{margin:0 0 2px 0;line-height:12px;}'+
				'#seci_inbox_container .siteLink{font-size:9px !important;text-decoration:none;font-weight:normal!important;margin-bottom:8px;display:inline-block;}'+
				'#seci_inbox_container .siteInfo a:hover{color:#888;}'+
				'#seci_cfg_container{height:300px; vertical-align:bottom;}'+
				'#seci_cfg_container a {color:black;}'+
				'.seci_new_item {color:red;}'+
				'.siteLinkFavicon{display:block;float:left;text-decoration:none;margin:0 6px 2px 2px;}'+
				'.siteLinkFavicon img{width:16px;height:16px;border:none;}'+
				'#seci_cfg_popup{display:none;border:1px solid black;background-color:white;color:black;width:300px;padding: 5px;}';		

			$("head").append('<style type="text/css">'+style+'</style>');

			var cfg_html = 
				'<div id="seci_cfg_container">'+
				'<p><a target="_blank" href="http://stackapps.com/questions/2985/">Feedback?  Support?  Visit this page.</a></p>'+
				'<p><a target="_blank" href="http://agent86ix.github.com/stackapps/seci/">Need an access token?  Click here.</a></p>'+
				'<p>Access token: <br><input id="seci_token_input" type=text size=40><button class="button" id="seci_cfg_token_save">Save</button></p>'+
				'<p>Mark unread items as read when you view them: <input type="checkbox" id="seci_clear_unread"></p>'+
				'</div>';
			
			var inbox_html = '<div id="seci_inbox_popup">'+cfg_html+
				'<div id="seci_inbox_container">(Loading...)</div>'+
				'<div class="seNav" id="seci_inbox_nav">'+
				'<button id="seci_tab_inbox" class="button">Inbox</button>  '+
				'<button id="seci_tab_config" class="button">Config</button></div></div>';
			

			
			
			$("#chat-buttons").append('<button id="seci_inbox_toggle" class="button">Inbox (-)</button>'+inbox_html);


			$("#seci_inbox_toggle").click(function () {
				$("#seci_cfg_container").hide();
				$("#seci_inbox_container").show();
				
				var button_pos = $("#seci_inbox_toggle").position();
				var popup_height = $("#seci_inbox_popup").outerHeight();
				
				$("#seci_inbox_popup").css({
					position: "absolute",
					top: (button_pos.top-popup_height) + "px",
					left: button_pos.left + "px"
				}).toggle();
				
				if($("#seci_inbox_popup").is(":visible")) {
					if(StackExchangeChatInbox.clear_unread) {
						StackExchangeChatInbox.fetch_inbox_url();
						$("#seci_inbox_toggle").html("Inbox (0)");
					}
				}


			});
			
			$("#seci_tab_inbox").click(function () {
				$("#seci_cfg_container").hide();
				$("#seci_inbox_container").show();
			});
			
			$("#seci_tab_config").click(function () {
				$("#seci_inbox_container").hide();
				$("#seci_cfg_container").show();
			});
			
			$("#seci_cfg_token_save").click(function () {
				StackExchangeChatInbox.access_token = $("#seci_token_input").val();
				localStorage.setItem("seci_token", StackExchangeChatInbox.access_token);
				$("#seci_inbox_container").html("Attempting to load your inbox, please wait...");
				StackExchangeChatInbox.checkToken();
				$("#seci_tab_inbox").click();
			});
			
			$("#seci_clear_unread").click(function () {
				StackExchangeChatInbox.clear_unread = $('#seci_clear_unread').attr('checked');
				localStorage.setItem("seci_clear_unread", StackExchangeChatInbox.clear_unread);
			});
			
			StackExchangeChatInbox.access_token = localStorage.getItem("seci_token");
			
			if(StackExchangeChatInbox.access_token) {
				$("#seci_token_input").val(StackExchangeChatInbox.access_token);	
			} else {
				$("#seci_inbox_container").html("No access token, please check the configuration.");
			}
			
			StackExchangeChatInbox.clear_unread = localStorage.getItem("seci_clear_unread");
			
			if(StackExchangeChatInbox.clear_unread) {
				$('#seci_clear_unread').attr('checked','checked')
			}
			
			StackExchangeChatInbox.checkToken();			
		
			$(document).click(function(e){ 
				if($("#seci_inbox_popup").is(":visible")) {
					if (!$(e.target).parents().filter('#seci_inbox_popup').length) { 
						if(e.target.id != "seci_inbox_toggle") {
							$("#seci_inbox_popup").hide();
						}
					} 
				}
			}); 
			
		} /* End of init() */
		
	} /* end of StackExchangeChatInbox */
	$(document).ready(function() {
		StackExchangeChatInbox.init();
	});


});
