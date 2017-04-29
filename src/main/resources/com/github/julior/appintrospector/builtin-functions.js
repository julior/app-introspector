importPackage(java.util);
importPackage(java.lang);
importPackage(java.io);


//converts a JS object into a java HashMap
function toMap(obj){
    var hm = new HashMap()
    for(k in obj){
        hm.put(k, toJava(obj[k]));
    }
    return hm;
}

//convert a JS array into a java ArrayList

function toArray(arr){
    var list = new ArrayList(arr.length);
    for(i in arr)
        list.add(toJava(arr[i]));
    return list;
}

//converts a json object into the equivalent java object
function toJava(obj){
    if(obj instanceof Array){
        return toArray(obj);
    } else if(obj instanceof java.lang.Object){
        return obj;
    } else if(typeof obj == "object"){
        return toMap(obj);
    } else{
        return obj;
    }
}
//add more functions

function getField(obj, fld){
    var field = obj.getClass().getDeclaredField(fld);
    field.setAccessible(true);
    return field.get(obj);
}

//exec a process
function exec(cmd){
    var cmdarr = (cmd instanceof Array)?cmd:cmd.split(/\s+/)
    var proc = new ProcessBuilder(cmdarr).redirectErrorStream(true).start();
    var reader = new BufferedReader(new InputStreamReader(proc.getInputStream()));
    var line = null;
    var resp = new StringBuilder();
    var sep = System.getProperty("line.separator");
    while((line=reader.readLine())!=null){
        resp.append(line).append(sep);
    }
    proc.waitFor();
    proc.exitValue();
    return resp.toString();
}

/*
* Executes a DB query in a DB.
*/
function dbquery(ds, sql, maxrows){
    var _maxrows = typeof maxrows == 'undefined'?100:maxrows;     
    var con = ds.getConnection()
    var resp = new StringBuilder();
    try{
        var rs = con.createStatement().executeQuery(sql);
        var meta = rs.getMetaData();
        for(var i=1;i<=meta.getColumnCount(); i++){            
            resp.append(i+"|").append(meta.getColumnLabel(i)).append("\t")
        }
        resp.append("\n")
        var count = 0;
        while(count < _maxrows && rs.next()){
            count++;
            for(var i=1;i<=meta.getColumnCount(); i++){
                var value = rs.getObject(i)
                resp.append(i+"|").append(value==null?"null": value).append('\t')
            }
            resp.append("\n");
        }
        if(rs.next()){
            resp.append("Results truncated to ").append(maxrows).append(" rows \n");
        }
    }catch(e){
        resp.append("error:" + e);
    }finally{
        con.close();
    }
    return resp.toString();
}


/*
* Executes an update command in a DB
*/
function dbupdate(ds,sql){
    var con = ds.getConnection()
    try{
        return con.createStatement().executeUpdate(sql);
    }catch(e){
        return "Error:" + e;
    }finally{
        con.close();
    }
}

/*
* Creates a new runnable instance from the given function
*/
function toRunnable(fun){
    return new java.lang.Runnable({
    run() {
        fun();
    }
    });
}

function toTimerTask(fun){
    return new com.github.julior.appintrospector.RunnableTimerTask(toRunnable(fun));
}

/*
* define variable or object in scope
*/
function define(name, func){
    globalScope.put(name, func);
}

//register functions below

var functions = toJava({"toJava":toJava, "getField":getField, "exec":exec, "dbquery":dbquery, "dbupdate":dbupdate
, "toRunnable":toRunnable, "toTimerTask":toTimerTask});

//return
functions

