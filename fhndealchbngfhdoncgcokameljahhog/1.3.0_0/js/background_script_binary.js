'use strict';var e=["NONE","ERROR","WARNING","INFO","DEBUG"],g={cep_proxy_url:!0,enable_auto_enrollment:!0,enable_certificate_renewal:!0,allow_machine_cert_enrollment:!0,user_enrollment_templates:!0,device_enrollment_templates:!0,placeholder_values:!0,company_info:!0,log_level:!0,device_cert_request_values:!0,signature_algo:!0,pending_ui_enabled:!0,renew_hours_before_expiry:!0,renew_reminder_interval:!0,request_timeout_seconds:!0,va_api_key:!0,va_enabled:!0,va_google_url:!0,va_shared_secret:!0,va_request_timeout_seconds:!0},
h=e.indexOf("WARNING"),k=e.indexOf("INFO"),l=e.indexOf("DEBUG"),n=function(a,b){0<b&&b<=l&&b<e.length&&console.log(e[b]+": "+a)},r=function(a,b,d){a=window.org.pkijs.fromBER(a);var c=new window.org.pkijs.simpl.CERT({schema:a.result});a=p(c);c=c.notAfter.value;q(a);var f=c.getTime();0<b&&c.setHours(c.getHours()-b);for(b=0;c.getTime()<f;){var m={};m.name=a;m.num=b++;m=JSON.stringify(m);chrome.alarms.create(m,{when:c.getTime()});c.setHours(c.getHours()+d)}},q=function(a){chrome.alarms.getAll(function(b){for(var d=
0;d<b.length;d++){var c=b[d],f=JSON.parse(c.name);f.name&&f.name==a&&chrome.alarms.clear(c.name)}})},p=function(a){return(new Uint8Array(a.serialNumber.value_block.value_hex)).toString()};var u=function(){try{chrome.storage.onChanged.addListener(this.h),chrome.runtime.onInstalled.addListener(this.b),chrome.runtime.onMessage.addListener(t),chrome.alarms.onAlarm.addListener(this.f),chrome.notifications.onClicked.addListener(this.j),chrome.notifications.onButtonClicked.addListener(this.i),chrome.browserAction.onClicked.addListener(this.g)}catch(a){}this.b({})},v=["ccr","background"],w=this;v[0]in w||"undefined"==typeof w.execScript||w.execScript("var "+v[0]);
for(var x;v.length&&(x=v.shift());){var y;if(y=!v.length)y=void 0!==u;y?w[x]=u:w=w[x]&&w[x]!==Object.prototype[x]?w[x]:w[x]={}}var z=["user","system"],A={};u.prototype.h=function(a,b){n("Handling managed policy change from control panel.",k);if("managed"==b){var d=A.enable_auto_enrollment,c;for(c in a)A[c]=a[c].newValue;B("ccrTabOpenedPreviously",function(a){a=void 0===a||void 0===a.ccrTabOpenedPreviously||!a.ccrTabOpenedPreviously;(!1===d||void 0===d&&a)&&C()})}};
var t=function(a,b,d){n("Handling request from the frontend.",k);if(void 0!==b.tab)switch(a.action){case "policyRequest":d(JSON.stringify(A));break;case "policyStore":a=JSON.parse(a.data),null!==a&&void 0!==a&&"object"==typeof a&&(A=a)}};u.prototype.b=function(a){void 0===a.OnInstalledReason?B("ccrInstalledPreviously",this.l):D(a.OnInstalledReason)};u.prototype.f=function(a){var b=JSON.parse(a.name);n("Alarm triggered. Name: "+a.name,l);if(b.name)for(a=b.name,b=0;b<z.length;b++)E(a,z[b])};
u.prototype.j=function(){F(!1)};u.prototype.i=function(a,b){1==b&&q(a)};u.prototype.g=function(){F(!1)};var B=function(a,b){void 0!==chrome.storage&&chrome.storage.local.get(a,b)};u.prototype.l=function(a){var b="";void 0!==a&&void 0!==a.ccrInstalledPreviously&&a.ccrInstalledPreviously||(b="install",G("ccrInstalledPreviously"));D(b)};
var G=function(a){var b={};b[a]=!0;chrome.storage.local.set(b,function(){})},D=function(a){if("install"===a)n("New install detected.",k),H(function(){C()});else{n("New update detected.",k);var b=A.enable_auto_enrollment;B("ccrTabOpenedPreviously",function(a){H(function(){var c=void 0===a||void 0===a.ccrTabOpenedPreviously||!a.ccrTabOpenedPreviously;(!1===b||void 0===b&&c)&&C()})})}},C=function(){A.enable_auto_enrollment&&F(!0)},F=function(a){var b={url:"html/request_certificate.html"};a?chrome.tabs.create(b,
function(){G("ccrTabOpenedPreviously")}):chrome.tabs.create(b,function(){})},H=function(a){try{chrome.storage.managed.get(function(b){if(0==Object.keys(b).length)n("No managed policy found. Consumer mode.",k);else{n("Managed policy found. Enterprise mode.",k);for(var d in b){var c=b[d];g[d]?A[d]=c:(c=chrome.i18n.getMessage("invalid_policy_var",[d,c.toString()]),n(c,h))}}a()})}catch(b){}},E=function(a,b){chrome.enterprise.platformKeys.getCertificates(b,function(d){I(d,b,a)})},I=function(a,b,d){n("Checking certificates for token: "+
b,l);var c=J(a,d);a=A.renew_hours_before_expiry?A.renew_hours_before_expiry:120;d=A.renew_reminder_interval?A.renew_reminder_interval:24;var f=new Date;0<c.length?(n("Matching certificate found. Checking expiry.",l),b=c[c.length-1],K(b.a,f,a)?(n("Certificate is still valid beyond configured offset.",l),r(b.c,a,d)):(n("Certificate will expire before configured offset.",l),b=p(b.a),a=[],d={},d.title=chrome.i18n.getMessage("renewal_notification_remind"),a.push(d),d={},d.title=chrome.i18n.getMessage("renewal_notification_ignore"),
a.push(d),chrome.notifications.create(b,{type:"basic",title:chrome.i18n.getMessage("renewal_notification_title"),iconUrl:"img/128.png",message:chrome.i18n.getMessage("renewal_notification_message"),buttons:a},function(){}))):n("No matching certificates found for token: "+b,l)},J=function(a,b){for(var d=[],c=0;c<a.length;c++){var f=window.org.pkijs.fromBER(a[c]);f=new window.org.pkijs.simpl.CERT({schema:f.result});var m={c:a[c],a:f};p(f)==b&&d.push(m)}0<d.length&&d.sort(L);return d},L=function(a,b){return a.a.notAfter.value>
b.a.notAfter.value?1:a.a.notAfter.value<b.a.notAfter.value?-1:0},K=function(a,b,d){var c=0;d&&(c=d);return a.notAfter.value.setHours(a.notAfter.value.getHours()-c)>b},M;void 0===M&&(M=new u);
