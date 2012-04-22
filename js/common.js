
function get_num(jquery_input_id)
{
	var result = parseInt($(jquery_input_id).val());
	if(!isFinite(result)) result = 0;
	return result;
}

function secondsToString(seconds)
{

	var numdays = Math.floor(seconds / 86400);
	var numhours = Math.floor((seconds % 86400) / 3600);
	var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
	var numseconds = Math.floor(((seconds % 86400) % 3600) % 60);
	var output = "";
	
	if(numdays == 1) output += numdays + " day ";
	else output += numdays + " days ";
	if(numhours == 1) output += numhours + " hour ";
	else output += numhours + " hours ";
	if(numminutes == 1) output += numminutes + " minute ";
	else output += numminutes + " minutes ";
	if(numseconds == 1) output += numseconds + " second ";
	else output += numseconds + " seconds ";
	
	return output;

}


function do_footer() {
	var license = '';
		
	var breadcrumbs = '<br><p><a id="pagefooter-mainmenu" href="/stackapps/">Main Menu</a></p><br>';
	
	$("#pagefooter").html('<div style="text-align:center; font-size:12px; clear:both;">'+breadcrumbs+license+'</div>');
	
	$("#pagefooter-mainmenu").button();
	
}

$(document).ready(function() {
	
	do_footer();
});
