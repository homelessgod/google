(function(){'use strict';var g=function(b,a){b+=a;if(2>b.length)return null;b=b.slice(-2);return f[b]?(a={back:1},a.text=f[b],a):null},h=function(){var b={"\u00e0":"a","\u00e8":"e","\u00e9":"e","\u00ec":"i","\u00ed":"i","\u00ee":"i","\u00f2":"o","\u00f3":"o","\u00f9":"u","\u00fa":"u","\u00c0":"A","\u00c8":"E","\u00c9":"E","\u00cc":"I","\u00cd":"I","\u00ce":"I","\u00d2":"O","\u00d3":"O","\u00d9":"U","\u00da":"U"};return function(a){var d=[];d.back=a.length;d.text=a.replace(/./g,function(e){return b[e]||e});return d}};var k,f={"`A":"\u00c0","`E":"\u00c8","`I":"\u00cc","`N":"\u01f8","`O":"\u00d2","`U":"\u00d9","`W":"\u1e80","`Y":"\u1ef2","`a":"\u00e0","`e":"\u00e8","`i":"\u00ec","`n":"\u01f9","`o":"\u00f2","`u":"\u00f9","`w":"\u1e81","`y":"\u1ef3","^A":"\u00c2","^C":"\u0108","^E":"\u00ca","^G":"\u011c","^H":"\u0124","^I":"\u00ce","^J":"\u0134","^O":"\u00d4","^S":"\u015c","^U":"\u00db","^W":"\u0174","^Y":"\u0176","^Z":"\u1e90","^a":"\u00e2","^c":"\u0109","^e":"\u00ea","^g":"\u011d","^h":"\u0125","^i":"\u00ee","^j":"\u0135",
"^o":"\u00f4","^s":"\u015d","^u":"\u00fb","^w":"\u0175","^y":"\u0177","^z":"\u1e91","~A":"\u00c3","~E":"\u1ebc","~I":"\u0128","~N":"\u00d1","~O":"\u00d5","~U":"\u0168","~V":"\u1e7c","~Y":"\u1ef8","~a":"\u00e3","~e":"\u1ebd","~i":"\u0129","~n":"\u00f1","~o":"\u00f5","~u":"\u0169","~v":"\u1e7d","~y":"\u1ef9",'"A':"\u00c4",'"E':"\u00cb",'"H':"\u1e26",'"I':"\u00cf",'"O':"\u00d6",'"U':"\u00dc",'"W':"\u1e84",'"X':"\u1e8c",'"Y':"\u0178",'"a':"\u00e4",'"e':"\u00eb",'"h':"\u1e27",'"i':"\u00ef",'"o':"\u00f6",
'"t':"\u1e97",'"u':"\u00fc",'"w':"\u1e85",'"x':"\u1e8d",'"y':"\u00ff",">A":"\u00c1",">C":"\u0106",">E":"\u00c9",">G":"\u01f4",">I":"\u00cd",">K":"\u1e30",">L":"\u0139",">M":"\u1e3e",">N":"\u0143",">O":"\u00d3",">P":"\u1e54",">R":"\u0154",">S":"\u015a",">U":"\u00da",">W":"\u1e82",">Y":"\u00dd",">Z":"\u0179",">a":"\u00e1",">c":"\u0107",">e":"\u00e9",">g":"\u01f5",">i":"\u00ed",">k":"\u1e31",">l":"\u013a",">m":"\u1e3f",">n":"\u0144",">o":"\u00f3",">p":"\u1e55",">r":"\u0155",">s":"\u015b",">u":"\u00fa",
">w":"\u1e83",">y":"\u00fd",">z":"\u017a"};google.elements.ime.loadConfig("it-t-i0-und",function(){var b={0:0,1:2,2:!0,3:!0,4:!1,5:!0,6:!1,7:!1,8:!1,9:!0,10:!0,29:!0,28:!1,11:!0,12:!1,32:!0,13:50,14:6,15:1};if(k)var a=k;else{a={};var d={c:"\u00e7",C:"\u00c7",ae:"\u00e6",aE:"\u00e6",oe:"\u0153",oE:"\u0153",Ae:"\u00c6",AE:"\u00c6",Oe:"\u0152",OE:"\u0152",ss:"\u00df"};for(c in d)a[c]=a[c]||[c],a[c].push(d[c]);for(var e in f){var c=e.charAt(1);a[c]=a[c]||[c];a[c].push(f[e])}k=a}b[16]=a;b[19]=g;b[21]=g;b[20]=h();b[22]=/[a-z`~"\^>]/i;b[27]=/[^a-z`~"\^>\u1e00-\u1ef9\u00c0-\u0233]/i;
return b}());}).call(this);
