// Copyright 2013 Google Inc. All Rights Reserved.

/**
 * @fileoverview If using the old webRequest API we need to have some way to
 * wait for the storage to load. This we achieve by having this page wait for
 * |url_list_loaded| flag to be set in the background page and re-load the url
 * to force it to go through the actual set of filters.
 */

var url = window.location.hash.substring(1);

function waitForStorageToLoad() {
  if (chrome.extension.getBackgroundPage().extension.hasFinishedLoading()) {
    window.location.href = url;
    return;
  }
  setTimeout(waitForStorageToLoad, 100);
}

// Only ever act on urls we actually care about.
var anchor = document.createElement('a');
anchor.href = url;
if (anchor.protocol === 'http:' || anchor.protocol === 'https:' ||
    anchor.protocol === 'file:') {
  window.addEventListener('load', waitForStorageToLoad);
}
