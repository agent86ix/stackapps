#!/usr/bin/env python

from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.api.urlfetch import fetch
from google.appengine.ext import db

import logging
import re
import datetime
try:
	import json
except ImportError:
	import simplejson as json 


	

class CachedAPIResponse(db.Model):
	cache_date = db.DateTimeProperty(auto_now_add=True)
	cache_string = db.TextProperty()


def fetch_site_list():
	query = db.Key.from_path('CachedAPIResponse', 'sites')
	cache_obj = db.get(query)
		
	if(cache_obj == None or (datetime.datetime.now() - cache_obj.cache_date) > datetime.timedelta(weeks=1) ):
		#if(cache_obj == None):
		#	logging.info("Server list cache refresh has occurred (no cache).");
		#else:
		#	logging.info("Server list cache refresh has occurred (cache stale).")
		api_response = fetch("https://api.stackexchange.com/2.0/sites?pagesize=1000")
		
		cache_obj = CachedAPIResponse(key_name='sites', cache_string=api_response.content)
		cache_obj.put()
	
	# logging.info("".join(("Returning: ", cache_obj.cache_string[:128], "...")))
	return cache_obj;
	
	
class DailyRepHandler(webapp.RequestHandler):
	def get(self):
	
		response = {'error':'An unknown error occurred.'}
	
		
		
		if(self.request.get('site') == '' or self.request.get('userid') == ''):
			response = {'error':'Invalid value for site or userid'}
		else:
			site = self.request.get('site')
			userid = self.request.get('userid')
			site_url = None
		
			site_list_obj = fetch_site_list()
			site_list = json.loads(site_list_obj.cache_string)
			for site_dict in site_list['items']:
				if('api_site_parameter' in site_dict):
					if(site_dict['api_site_parameter'] == site):
						site_url = site_dict['site_url']
						break;
					#else:
					#	logging.info("not a match: %s != %s"%(site_dict['api_site_parameter'], site))
			
			if(site_url == None):
				response = {'error':'Invalid site specified'}
			else:
				rep_url = ''.join((site_url,"/users/",userid,"/?tab=reputation&sort=graph"))
				logging.info(rep_url);
				rep_response = fetch(rep_url)
				rep_content = rep_response.content
				
				rep_list_end = -1;
				rep_list_start = rep_content.find('rawData');
				if(rep_list_start > 0):
					rep_list_end = rep_content.find(';', rep_list_start)
				if(rep_list_end < 0 or rep_list_start < 0):
					response = {'error':'Error parsing rep response'}
				else:
					rep_content = rep_content[rep_list_start:rep_list_end]
					rep_list = re.findall(r"\d+,\d+,\d+,(\d+)",rep_content)
					rep_count = 0
					
					for rep_item in rep_list:
						if(int(rep_item) > 199):
							rep_count = rep_count+1
					
					response = {'repcount':rep_count}
		

		self.response.headers.add_header("Content-Type", "application/json")
		self.response.headers.add_header("Access-Control-Allow-Origin", "*")
	
		self.response.out.write(json.dumps(response));
		
class SiteListHandler(webapp.RequestHandler):
	def get(self):
		
		
		cache_obj = fetch_site_list();
		
		response = None
		
		if(self.request.get('site') != ''):
			match_site = self.request.get('site')
			match_site_list = []
			site_list = json.loads(cache_obj.cache_string)
			for site_dict in site_list['items']:
				if('api_site_parameter' in site_dict):
					if(site_dict['api_site_parameter'] == match_site):
						match_site_list.append(site_dict)
			response_dict = {'items':match_site_list, 'has_more':False}
			response = json.dumps(response_dict)
		elif(self.request.get('site_url') != ''):
			match_site = self.request.get('site_url')
			match_site_list = []
			site_list = json.loads(cache_obj.cache_string)
			for site_dict in site_list['items']:
				if('site_url' in site_dict):
					if(site_dict['site_url'] == match_site):
						match_site_list.append(site_dict)
			response_dict = {'items':match_site_list, 'has_more':False}
			response = json.dumps(response_dict)
		else:
			response = cache_obj.cache_string
		
		if(self.request.get('callback') != None):
			pass
			
		
		
		self.response.headers.add_header("Access-Control-Allow-Origin", "*")
		self.response.headers.add_header("Content-Type", "application/json")
		expires_date = datetime.datetime.utcnow() + datetime.timedelta(weeks=1)
		expires_str = expires_date.strftime("%d %b %Y %H:%M:%S GMT")
		self.response.headers["Cache-Control"] = "max-age: 604800"
		
		self.response.headers.add_header("Expires", expires_str)
		#print("Response: %s...\n"%(response[:50]))
		self.response.out.write(response);


def main():
	application = webapp.WSGIApplication([('/sites', SiteListHandler), ('/dailyrep', DailyRepHandler)],debug=True)
	util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
