$(document).ready(function(){
    $.ajaxSetup({ cache: false });
    $("[data-role=tab]").each(function(){
        if ($(this).attr('default') === undefined) {
            $(this).hide();
        }
    });
    $("[data-role='tab-trigger']").on("click", function(){
        let target = $(this).attr('data-target');
        $("[data-role=tab]").each(function(){
            $(this).hide();
        });
        $(`${target}[data-role=tab]`).show();
    });

    $("[data-role='request']").on("click", function(){
        let request = $(this).attr('data-request');
        let attrs = $(this).attr('data-attrs');
        let token = $("#token").val();
        let unique = $(this).attr('data-unique');
        let attr_arr = []
        if (attrs != undefined) {
            attr_arr = attrs.split(":");
        }
        let arr = request.split("*");
        let response = request;
        if ($(this).attr('data-target') !== undefined) {
            response = $(this).attr('data-target');
        }
        console.log(`attr arrr is ${attr_arr}, size is ${attr_arr.length}`);
        console.log(`arrr data is ${arr[2]}`);
        let json = JSON.parse(arr[2]);
        json.token = token;
        if (unique != undefined) {
            attr_arr.forEach((el) => {
                json[el] = $(`[data-unique=${unique}][data-attr=${el}]`).val();
            });
        } else {
            attr_arr.forEach((el) => {
                json[el] = $(`[data-attr=${el}]`).val();
            });
        }
        console.log(`json string is ${JSON.stringify(json)}`);
        console.log(json);
        $.ajax({
            url: arr[1],
            method: arr[0],
            data: json,
            // cache: false,
            success: function(data) {
                console.log("Response destination: " + response);
                console.log(JSON.stringify(data));
                $(`[data-response=${response}]`).text(data);
            }
        });
    });
});