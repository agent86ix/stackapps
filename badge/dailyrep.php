<?php

$result_error = array("error"=>"HTML parsing error.");

$site = $_GET["site"];
if(preg_match("#[^.\w\d]#", $site)) {
	die(json_encode(array("error"=>"Invalid site parameter.")));
}
$userid = $_GET["userid"];
if(preg_match("#[^\d]#", $userid)) {
	die(json_encode(array("error"=>"Invalid userid parameter")));
}

$site_translations = array(
	"stackoverflow"=>"stackoverflow.com",
	"meta.stackoverflow"=>"meta.stackoverflow.com",
	"serverfault"=>"serverfault.com",
	"meta.serverfault"=>"meta.serverfault.com",
	"superuser"=>"superuser.com",
	"meta.superuser"=>"meta.superuser.com",
	"askubuntu"=>"askubuntu.com",
	"meta.askubuntu"=>"meta.askubuntu.com");

if(array_key_exists($site, $site_translations)) {
	$site = $site_translations[$site];
} else {
	$site = $site . ".stackexchange.com";
}


$rep_html = file_get_contents("http://$site/users/$userid/?tab=reputation&sort=graph");

$startpos = strpos($rep_html, "rawData");
if($startpos === false) {
	die(json_encode(array("error"=>"HTML parsing error. (Can't find rawData)")));
}

$rep_html = substr($rep_html, $startpos);

$endpos = strpos($rep_html, ";");
if($endps === false) {
	die(json_encode(array("error"=>"HTML parsing error. (Can't find array ending)")));
}

$rep_html = substr($rep_html, 0, $endpos);

//print($rep_html);

preg_match_all("#\d+,\d+,\d+,(\d+)#",$rep_html, $daily_rep_matches, PREG_PATTERN_ORDER);

$repcount = 0;

if($daily_rep_matches && count($daily_rep_matches)>1 && count($daily_rep_matches[1])) {
	foreach($daily_rep_matches[1] as $rep_str) {
		//print("$rep_str\n");
		if(intval($rep_str) > 199) {
			$repcount = $repcount + 1;
		}
	}
}

die(json_encode(array("repcount"=>$repcount)));

?>
