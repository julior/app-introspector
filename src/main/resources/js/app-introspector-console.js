// app-introspector-console script

function initSpringConsole(){
    var cm;
    var scriptStore;
    function postScript(text){
	$('#spinner').show();
	$('#exec-info').text('');
	$("#resultText").text('');
	var start = new Date().getTime();
	$.ajax({
	    type:'POST',
	    url:'/spring/run',
	    contentType:'text/plain',
	    data:text,
	    success(data) {
		$("#resultText").text(typeof(data) == 'string'?data:JSON.stringify(data, null, 4));
		var end = new Date();
		$('#exec-info').text('completed in '+ duration(end.getTime()-start) + ' at ' + end.getHours() + ':' +
				     end.getMinutes() + ':' + end.getSeconds() + '.' + end.getMilliseconds());
		$('#spinner').hide();
	    }
	});
    }

    function duration(ms){
	if(ms<1000) return ms + ' msecs';
	if(ms<60000) return (ms/1000).toFixed(2) + ' secs';
	return (ms/60000).toFixed(2) + ' mins';
    }

    function showBeanInfo(beanId){
	$.getJSON('/spring/bean?id='+beanId + '&im=true', bean => {
	    if(bean["class"]!=null){
		$('#beanClass').html('<em>' + beanId + '</em>: ' + bean["class"].substr(bean["class"].lastIndexOf('.')+1));
	    }else{
		$('#beanClass').text(beanId)
	    }

	    var $bf=$('#beanFields').empty();
	    $.each(bean["properties"], (key, val) => {
		$bf.append($('<li></li>').addClass('list-group-item').html('<em>' + key + '</em> = ' + val));
	    });

	    var $bm=$('#beanMethods').empty();
	    $.each(bean["methods"], (i, meth) => {
		$bm.append($('<li></li>').addClass('list-group-item').html(meth.returnType + ' <em>' + meth.name + '</em>' + '('  + meth.paramTypes.join(', ')+ ')'));
	    });
	    $('#infoPanel').show();
	});
    }

    function loadScript(scriptId){
	scriptStore.retrieve(scriptId, value => {
	    cm.setValue(value);
	    $('#scriptName').val(scriptId);
	});
    }

    function saveScript(name){
	scriptStore.saveScript(name, cm.getValue());
	$('#savedScripts').val(name);
	$('#toast').text('Script Saved').show().fadeOut(2000);
    }

    function firebaseStore(dataRef){
	var scriptsRef = dataRef.child('scripts');
	return {
	    saveScript(name, scriptBody) {
		scriptsRef.child(name).set({content:scriptBody});
	    },
	    bindTo(elem) {
		scriptsRef.on('child_added', snapshot => {
		    //console.log('snapshot is ' + JSON.stringify(snapshot));
		    var name = snapshot.name();
		    $(elem).append($('<option></option>').attr('value', name).text(name));
		});
	    },
	    retrieve(name, callback) {
		scriptsRef.child(name).on('value', snapshot => {
		    callback(snapshot.val().content);
		});
	    }
	};
    }

    function localStore(){
	return {
	    saveScript(name, scriptBody) {
		var stored = JSON.parse(localStorage.getItem('STORED_SCRIPTS'));
		if(stored==null) stored = {};
		var isnew = typeof(stored[name])=='undefined';
		stored[name]=scriptBody;
		localStorage.setItem('STORED_SCRIPTS', JSON.stringify(stored));
		if(isnew){
		    this.selectField.append($('<option></option>').attr('value', name).text(name));
		}
	    },
	    bindTo(elem) {
		this.selectField = $(elem);
		var stored = JSON.parse(localStorage.getItem('STORED_SCRIPTS'));
		var $ss = $(elem);
		$.each(stored, (name, value) => {
		    $ss.append($('<option></option>').attr('value', name).text(name))
		});
	    },
	    retrieve(name, callback) {
		var stored = JSON.parse(localStorage.getItem('STORED_SCRIPTS'));
		callback(stored[name]);
	    }
	};
    }

    //config firebase from data
    function initScriptStore(){
	//default to local store
	scriptStore = localStore();
	$.ajax({type:'GET', url:'/spring/firebase', contentType:'application/json', success(data) {
	    if(data.firebaseUrl){
		console.log('connecting to firebase');
		var dataRef = new Firebase(data.firebaseUrl);
		dataRef.auth(data.firebaseJwt, error => {
		    if(error){
			console.log('Failed authentication to firebase ' + error);
		    }else{
			scriptStore = firebaseStore(dataRef);
			console.log('connected to firebase');
		    }
		    scriptStore.bindTo('#savedScripts');
		});
	    } else{
		console.log('firebase details not provided :' + data);
		scriptStore.bindTo('#savedScripts');
	    }
	}});
    }

    //initialise
    $('#content').height($(window).height());
    cm = CodeMirror.fromTextArea($('#scriptArea').get(0));
    cm.setSize('100%',160);
    console.log('code mirror ' + cm);
    initScriptStore();
    $('title').text('Spring Console: ' + window.location.host);

    var $bl = $('#beanList');
    $bl.empty();
    $.getJSON('/spring/beanNames', data => {
	beans = data;
	$.each(data, (index, val) => {
	    $bl.append($('<option></option>').attr('value',val).text(val));
	});
    });

    $bl.click(event => {
	showBeanInfo($(event.target).val());
    });

    $('#savedScripts').change(function(e){
	loadScript($(this).val());
    });

    $('#btnExec').click(() => {
	postScript(cm.getValue());
    });

    $('#btnSave').click(() => {
	if($('#savedScripts').val()!=''){
	    saveScript($('#savedScripts').val());
	} else{
	    var aText = cm.getValue(); 
	    if(aText.trim().length<=0) return;
	    $('#scriptName').val('');
	    $('#saveAsDialog').modal();		    
	}
    });
    
    $('#btnClear').click(() => {
	$('#savedScripts').val('');
	cm.setValue('');
    });

    $('#scriptName').keypress(e => {
	if(e.which!=13) return;
	var input = $('#scriptName');
	if(input.val().trim().length<=0){
	    input.parent().addClass('has-error');
	    return;
	}
	saveScript(input.val().trim());
	$('#saveAsDialog').modal('hide');	
    });

    $('#scriptArea').parent().keydown(e => {
	if(event.ctrlKey){
	    switch(event.which){
		case 13: postScript(cm.getValue()); return;
		case 66: $('#btnSave').click(); return;
		case 73: $('#btnClear').click(); return;
		//default : console.log('other key ' + event.which);
	    }
	}
    });
    $('#scriptContainer').resizable({
	resize() {
	    cm.setSize($(this).width(), $(this).height());
	}
    });
    //resize to fill window
    var gap = $(window).height() - ($('.row').position().top + $('.row').height());
    if(gap>0){
	var sc = $('#scriptContainer');
	sc.height(sc.height()+gap/2);
	cm.setSize(sc.width(), sc.height());
	var rt = $('#resultText');
	rt.height(rt.height()+gap/2);
    }
    //load server info
    $.ajax({type:'GET', url:'/spring/serverinfo', contentType:'application/json', success(data) {
	$('#appLabel').text(data.appName + ' : ' + (data.hostname || ''));
    }});
    
    $('#saveAsDialog').on('shown.bs.modal', () => {
	var input = $('#scriptName');
	input.val('').focus();
	input.parent().removeClass('has-error');
    }).on('hidden.bs.modal', () => {
	cm.focus();
    });

}
