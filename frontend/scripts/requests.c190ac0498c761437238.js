(window.webpackJsonp=window.webpackJsonp||[]).push([[15],{243:function(t,e,n){"use strict";var r=n(6);t.exports=function(t,e){var n=[][t];return!!n&&r((function(){n.call(null,e||function(){throw 1},1)}))}},244:function(t,e,n){var r=n(245);t.exports=function(t){if(r(t))throw TypeError("The method doesn't accept regular expressions");return t}},245:function(t,e,n){var r=n(5),a=n(20),o=n(4)("match");t.exports=function(t){var e;return r(t)&&(void 0!==(e=t[o])?!!e:"RegExp"==a(t))}},246:function(t,e,n){var r=n(4)("match");t.exports=function(t){var e=/./;try{"/./"[t](e)}catch(n){try{return e[r]=!1,"/./"[t](e)}catch(t){}}return!1}},247:function(t,e,n){"use strict";var r=n(7),a=n(21),o=n(16),i=n(6),s=n(243),c=[],l=c.sort,u=i((function(){c.sort(void 0)})),f=i((function(){c.sort(null)})),p=s("sort");r({target:"Array",proto:!0,forced:u||!f||!p},{sort:function(t){return void 0===t?l.call(o(this)):l.call(o(this),a(t))}})},248:function(t,e,n){"use strict";var r=n(0),a=n.n(r),o=a.a.memo((function(t){var e,n="".concat(t.id,"Modal");return e="string"==typeof t.body&&t.html?a.a.createElement("div",{dangerouslySetInnerHTML:{__html:t.body}}):t.body,a.a.createElement("div",{className:"modal fade",id:n,tabIndex:-1,role:"dialog"},a.a.createElement("div",{className:"modal-dialog modal-dialog-centered modal-xl",role:"document"},a.a.createElement("div",{className:"modal-content"},a.a.createElement("div",{className:"modal-header"},a.a.createElement("h5",{className:"modal-title",id:"".concat(n,"Label")},t.title),a.a.createElement("button",{type:"button",className:"close","data-dismiss":"modal"},a.a.createElement("span",{"aria-hidden":"true"},"×"))),a.a.createElement("div",{className:"modal-body"},e),a.a.createElement("div",{className:"modal-footer"},a.a.createElement("button",{type:"button",className:"btn btn-secondary","data-dismiss":"modal"},"Close")))))}));e.a=o},251:function(t,e,n){"use strict";var r,a=n(7),o=n(36).f,i=n(17),s=n(244),c=n(60),l=n(246),u=n(25),f="".startsWith,p=Math.min,d=l("startsWith");a({target:"String",proto:!0,forced:!!(u||d||(r=o(String.prototype,"startsWith"),!r||r.writable))&&!d},{startsWith:function(t){var e=String(c(this));s(t);var n=i(p(arguments.length>1?arguments[1]:void 0,e.length)),r=String(t);return f?f.call(e,r,n):e.slice(n,n+r.length)===r}})},252:function(t,e,n){"use strict";n(50),n(51),n(52),n(128),n(85),n(35),n(84),n(86),n(53),n(54),n(55),n(56),n(57),n(58),n(59);var r=n(0),a=n.n(r);function o(t){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function i(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){if("undefined"==typeof Symbol||!(Symbol.iterator in Object(t)))return;var n=[],r=!0,a=!1,o=void 0;try{for(var i,s=t[Symbol.iterator]();!(r=(i=s.next()).done)&&(n.push(i.value),!e||n.length!==e);r=!0);}catch(t){a=!0,o=t}finally{try{r||null==s.return||s.return()}finally{if(a)throw o}}return n}(t,e)||function(t,e){if(!t)return;if("string"==typeof t)return s(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);"Object"===n&&t.constructor&&(n=t.constructor.name);if("Map"===n||"Set"===n)return Array.from(t);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return s(t,e)}(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function s(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,r=new Array(e);n<e;n++)r[n]=t[n];return r}function c(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function l(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function u(t,e){return(u=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function f(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}();return function(){var n,r=d(t);if(e){var a=d(this).constructor;n=Reflect.construct(r,arguments,a)}else n=r.apply(this,arguments);return p(this,n)}}function p(t,e){return!e||"object"!==o(e)&&"function"!=typeof e?function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t):e}function d(t){return(d=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}var h=function(t){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&u(t,e)}(s,t);var e,n,r,o=f(s);function s(){return c(this,s),o.apply(this,arguments)}return e=s,(n=[{key:"render",value:function(){var t=this,e=!0,n=this.props.options.map((function(n){var r,o=i(n,2),s=o[0],c=o[1],l="btn btn-primary".concat(e?" active":"");return r=t.props.handleSort?a.a.createElement("label",{key:s,className:l,onClick:function(){return t.props.handleSort(s)}},a.a.createElement("input",{type:"radio",name:t.props.name,id:s}),c):a.a.createElement("label",{key:s,className:l},a.a.createElement("input",{type:"radio",name:t.props.name,id:s}),c),e=!1,r}));return a.a.createElement("div",{className:"input-group col-12"},a.a.createElement("input",{type:"text",className:"form-control",placeholder:this.props.placeholder,value:this.props.filter,onChange:this.props.handleFilter}),a.a.createElement("div",{className:"input-group-append btn-group btn-group-toggle","data-toggle":"buttons"},n))}}])&&l(e.prototype,n),r&&l(e,r),s}(a.a.PureComponent);e.a=h},254:function(t,e,n){var r=n(7),a=n(255);r({target:"Object",stat:!0,forced:Object.assign!==a},{assign:a})},255:function(t,e,n){"use strict";var r=n(11),a=n(6),o=n(61),i=n(88),s=n(62),c=n(16),l=n(87),u=Object.assign,f=Object.defineProperty;t.exports=!u||a((function(){if(r&&1!==u({b:1},u(f({},"a",{enumerable:!0,get:function(){f(this,"b",{value:3,enumerable:!1})}}),{b:2})).b)return!0;var t={},e={},n=Symbol();return t[n]=7,"abcdefghijklmnopqrst".split("").forEach((function(t){e[t]=t})),7!=u({},t)[n]||"abcdefghijklmnopqrst"!=o(u({},e)).join("")}))?function(t,e){for(var n=c(t),a=arguments.length,u=1,f=i.f,p=s.f;a>u;)for(var d,h=l(arguments[u++]),m=f?o(h).concat(f(h)):o(h),y=m.length,b=0;y>b;)d=m[b++],r&&!p.call(h,d)||(n[d]=h[d]);return n}:u},263:function(t,e,n){"use strict";var r=n(7),a=n(133).includes,o=n(132);r({target:"Array",proto:!0,forced:!n(37)("indexOf",{ACCESSORS:!0,1:0})},{includes:function(t){return a(this,t,arguments.length>1?arguments[1]:void 0)}}),o("includes")},264:function(t,e,n){"use strict";var r=n(7),a=n(244),o=n(60);r({target:"String",proto:!0,forced:!n(246)("includes")},{includes:function(t){return!!~String(o(this)).indexOf(a(t),arguments.length>1?arguments[1]:void 0)}})},302:function(t,e,n){"use strict";n.r(e),n.d(e,"Requests",(function(){return S}));n(50),n(51),n(52),n(129),n(128),n(85),n(263),n(35),n(84),n(86),n(247),n(53),n(254),n(54),n(55),n(56),n(57),n(264),n(58),n(251),n(59);var r=n(0),a=n.n(r),o=n(1);var i,s=n(248),c=n(252),l=n(2),u=a.a.memo((function(t){var e="Request ".concat(t.i,": ").concat(t.q," ").concat(t.n," ");switch(t.u&&(e+="by ".concat(t.u," ")),t.s){case 1:e+="(accepted)";break;case 2:e+="(denied)";break;default:e+="(pending)"}return a.a.createElement("div",{className:"card"},a.a.createElement("div",{className:"card-body"},a.a.createElement("h5",{className:"card-title"},e),a.a.createElement("button",{type:"button",className:"close",onClick:function(){return t.toggle(t.i)}},a.a.createElement("span",null,"^")),a.a.createElement("p",{className:"card-text"},t.r,t.d)))}));function f(t){return(f="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function p(){return(p=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t}).apply(this,arguments)}function d(t){if("undefined"==typeof Symbol||null==t[Symbol.iterator]){if(Array.isArray(t)||(t=function(t,e){if(!t)return;if("string"==typeof t)return h(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);"Object"===n&&t.constructor&&(n=t.constructor.name);if("Map"===n||"Set"===n)return Array.from(t);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return h(t,e)}(t))){var e=0,n=function(){};return{s:n,n:function(){return e>=t.length?{done:!0}:{done:!1,value:t[e++]}},e:function(t){throw t},f:n}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var r,a,o=!0,i=!1;return{s:function(){r=t[Symbol.iterator]()},n:function(){var t=r.next();return o=t.done,t},e:function(t){i=!0,a=t},f:function(){try{o||null==r.return||r.return()}finally{if(i)throw a}}}}function h(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,r=new Array(e);n<e;n++)r[n]=t[n];return r}function m(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function y(t,e){return(y=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function b(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}();return function(){var n,r=E(t);if(e){var a=E(this).constructor;n=Reflect.construct(r,arguments,a)}else n=r.apply(this,arguments);return v(this,n)}}function v(t,e){return!e||"object"!==f(e)&&"function"!=typeof e?g(t):e}function g(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function E(t){return(E=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}!function(t){t.ALL="",t.PENDING="p",t.ACCEPTED="a",t.DENIED="d"}(i||(i={}));var N=[[i.PENDING,"pending"],[i.ACCEPTED,"accepted"],[i.DENIED,"denied"],[i.ALL,"all"]],S=function(t){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&y(t,e)}(h,t);var e,n,r,f=b(h);function h(t){var e;return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,h),(e=f.call(this,t)).state={filter:"",sort:i.PENDING},e.denyChange=e.denyChange.bind(g(e)),e.handleApprove=e.handleApprove.bind(g(e)),e.handleChange=e.handleChange.bind(g(e)),e.handleCreate=e.handleCreate.bind(g(e)),e.handleDeny=e.handleDeny.bind(g(e)),e.handleFilter=e.handleFilter.bind(g(e)),e.handleSort=e.handleSort.bind(g(e)),e.toggle=e.toggle.bind(g(e)),e.toggleNew=e.toggleNew.bind(g(e)),e}return e=h,(n=[{key:"componentDidUpdate",value:function(t){if(this.state.activeReq&&t!==this.props){var e,n=d(this.props.requests);try{for(n.s();!(e=n.n()).done;){var r=e.value;r.i===this.state.activeReq&&0!==r.s&&($("#requestsModal").modal("hide"),this.setState({activeReq:void 0}))}}catch(t){n.e(t)}finally{n.f()}}else if(this.state.name&&this.state.description&&this.state.quantity&&this.props.requests.length>t.requests.length)for(var a=this.props.requests.length-1;a>=0;a--){var o=this.props.requests[a];if(o.d===this.state.description&&o.n===this.state.name&&o.q===this.state.quantity){$("#newRequestModal").modal("hide");break}}}},{key:"render",value:function(){var t,e=this,n=this.props.selected?"visible":"invisible",r=this.state.filter,o=this.props.requests.filter((function(n){var a,o=!0;if(""!==r&&(e.props.admin&&r.startsWith("u:")?o=(n.u||"").startsWith(r.substring(2)):(a=r,o=isNaN(a)||parseInt(a)!=a||isNaN(parseInt(a,10))?n.n.includes(r):n.i.toString(10).includes(r))),o)switch(e.state.sort){case i.PENDING:o=0===n.s;break;case i.ACCEPTED:o=1===n.s;break;case i.DENIED:o=2===n.s}return o&&e.state.activeReq===n.i&&(t=n),o})).sort((function(t,e){return Object(l.b)(t.i,e.i,-1)})).map((function(t){return a.a.createElement(u,p({key:t.i,toggle:e.toggle},t))})),f="Request id or item name";this.props.admin&&(f+=" or u: for username");var d="",h="";if(t){var m,y=new Date(t.c).toLocaleString("en-US");switch(h="Request ".concat(t.i,": ").concat(t.q," ").concat(t.n," (").concat(y,")"),t.s){case 1:m="accepted";break;case 2:m="denied";break;default:m="pending"}d=this.props.admin&&0===t.s?a.a.createElement(a.a.Fragment,null,a.a.createElement("h4",null,"This request is ",a.a.createElement("strong",null,m)),a.a.createElement("div",null,t.d),a.a.createElement("div",{className:"input-group mt-3"},a.a.createElement("div",{className:"input-group-prepend"},a.a.createElement("button",{className:"btn btn-outline-success",type:"button",onClick:this.handleApprove},"Approve"),a.a.createElement("button",{className:"btn btn-outline-danger",type:"button",disabled:!this.state.deny,onClick:this.handleDeny},"Deny")),a.a.createElement("input",{type:"text",className:"form-control",placeholder:"Reason for denying",value:this.state.deny,onChange:this.denyChange}))):a.a.createElement(a.a.Fragment,null,a.a.createElement("h4",null,"This request is ",a.a.createElement("strong",null,m)),a.a.createElement("div",null,t.d))}var b=this.state.description&&this.state.name&&void 0!==this.state.quantity&&this.state.quantity>0;return a.a.createElement("div",{className:n},a.a.createElement("div",{className:"col-12"},a.a.createElement("button",{type:"button",className:"col-12 btn btn-primary mb-3",onClick:this.toggleNew},"Request an item!")),a.a.createElement(c.a,{filter:this.state.filter,name:"requests",options:N,placeholder:f,handleFilter:this.handleFilter,handleSort:this.handleSort}),a.a.createElement(s.a,{body:d,id:"requests",title:h}),a.a.createElement(s.a,{body:a.a.createElement(a.a.Fragment,null,a.a.createElement("div",{className:"input-group mb-4"},a.a.createElement("div",{className:"input-group-prepend"},a.a.createElement("span",{className:"input-group-text"},"Name and quantity")),a.a.createElement("input",{className:"form-control",onChange:this.handleChange,name:"n",placeholder:"name",type:"text",value:this.state.name}),a.a.createElement("input",{className:"form-control",onChange:this.handleChange,name:"q",placeholder:"quantity",type:"number",min:1,value:this.state.quantity})),a.a.createElement("div",{className:"input-group mb-4"},a.a.createElement("div",{className:"input-group-prepend"},a.a.createElement("span",{className:"input-group-text"},"Description")),a.a.createElement("textarea",{className:"form-control",name:"d",onChange:this.handleChange,value:this.state.description,placeholder:"description"})),a.a.createElement("button",{type:"button",className:"btn-success btn col-12",disabled:!b,onClick:this.handleCreate},"Create request!")),id:"newRequest",title:"New item!"}),a.a.createElement("div",{className:"card-columns col-12 mt-2"},o))}},{key:"denyChange",value:function(t){this.setState({deny:t.target.value})}},{key:"handleApprove",value:function(){if(this.state.activeReq&&confirm("Are you sure you want to approve this request?")){var t={a:!0,i:this.state.activeReq};this.props.socket.emit(o.l,t)}}},{key:"handleDeny",value:function(){if(this.state.activeReq){if(!this.state.deny)return void alert("You must provide a reason for rejecting this request");if(confirm("Are you sure you want to deny this request?")){var t={a:!1,i:this.state.activeReq,r:this.state.deny};this.props.socket.emit(o.l,t)}}}},{key:"handleChange",value:function(t){switch(t.target.name){case"d":this.setState({description:t.target.value});break;case"q":this.setState({quantity:t.target.valueAsNumber});break;case"n":this.setState({name:t.target.value})}}},{key:"handleCreate",value:function(){if(this.state.description&&this.state.name&&void 0!==this.state.quantity&&this.state.quantity>0){var t={d:this.state.description,n:this.state.name,q:this.state.quantity};this.props.socket.emit(o.m,t)}}},{key:"handleFilter",value:function(t){this.setState({filter:t.target.value})}},{key:"handleSort",value:function(t){this.setState({sort:t})}},{key:"toggle",value:function(t){this.setState({activeReq:t,deny:""}),$("#requestsModal").modal("show")}},{key:"toggleNew",value:function(){this.setState({description:"",name:"",quantity:1}),$("#newRequestModal").modal("show")}}])&&m(e.prototype,n),r&&m(e,r),h}(a.a.PureComponent);e.default=S}}]);