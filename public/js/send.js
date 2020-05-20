function test1(){
    var formData = $("#form1").serialize();
   
    $.ajax({
        cache : false,
        url : "/sendConfirm?price_transfer", 
        type : 'GET', 
        data : formData, 
        success : function(data) {
          //  var jsonObj = JSON.parse(data);
        
        
        }, // success 

        error : function(xhr, status) {
            alert(xhr + " : " + status);
        }
    }); // $.ajax */
    }

    
    function getParam(sname) {

        var params = location.search.substr(location.search.indexOf("?") + 1);
        var sval = "";
        params = params.split("&");
        for (var i = 0; i < params.length; i++) {
            temp = params[i].split("=");
            if ([temp[0]] == sname) { sval = temp[1]; }
        }
    
        return sval;
    
    }

    
