OV.ShowSettingsDialog = function (importSettings, onOk)
{
    let dialogSettings = {
        defaultColor : importSettings.defaultColor,
    };
    
    let edgesSettings = {
        edgesColor : importSettings.edgesColor, 
        showEdges : importSettings.showEdges,
        edgesAngle : importSettings.edgesAngle,
    };
    let dialog = new OV.ButtonDialog ();
    let contentDiv = dialog.Init ('Settings', [
        {
            name : 'Cancel',
            subClass : 'outline',
            onClick () {
                dialog.Hide ();
            }
        },
        {
            name : 'OK',
            onClick () {
                dialog.Hide ();                
                onOk (dialogSettings, edgesSettings);
            }
        }
    ]);
    
    let colorRow = $('<div>').addClass ('ov_dialog_table_row').appendTo (contentDiv);
    $('<div>').html ('Default Color').addClass ('ov_dialog_table_row_name').appendTo (colorRow);
    let valueColumn = $('<div>').addClass ('ov_dialog_table_row_value').appendTo (colorRow);
    let colorInput = $('<input>').attr ('type', 'color').addClass ('ov_dialog_color').appendTo (valueColumn);
    $('<span>').addClass ('ov_dialog_table_row_comment').html ('(For surfaces with no material)').appendTo (valueColumn);
    colorInput.val ('#' + OV.ColorToHexString (dialogSettings.defaultColor));
    colorInput.change (function () {
        let colorStr = colorInput.val ().substr (1);
        dialogSettings.defaultColor = OV.HexStringToColor (colorStr);
    });

    let showEdgeRow = $('<div>').addClass ('ov_dialog_table_row').appendTo (contentDiv);
    $('<div>').html ('Show Edges').addClass ('ov_dialog_table_row_name').appendTo (showEdgeRow);
    let seValueColumn = $('<div>').addClass ('ov_dialog_table_row_value').appendTo (showEdgeRow);
    let showEdgeInput = $('<input>').attr ('type', 'checkbox').addClass ('ov_dialog_checkradio').appendTo (seValueColumn);
    $('<span>').addClass ('ov_dialog_table_row_comment').html ('(Overlay edge on model)').appendTo (seValueColumn);
    showEdgeInput.attr ('checked', edgesSettings.showEdges);
    showEdgeInput.change (function () {
        edgesSettings.showEdges = showEdgeInput.prop ('checked');
    });
    
    let edgeColorRow = $('<div>').addClass ('ov_dialog_table_row').appendTo (contentDiv);
    $('<div>').html ('Edges Color').addClass ('ov_dialog_table_row_name').appendTo (edgeColorRow);
    let ecValueColumn = $('<div>').addClass ('ov_dialog_table_row_value').appendTo (edgeColorRow);
    let edgeColorInput = $('<input>').attr ('type', 'color').addClass ('ov_dialog_color').appendTo (ecValueColumn);
    $('<span>').addClass ('ov_dialog_table_row_comment').html ('(For overlaid edges)').appendTo (ecValueColumn);
    edgeColorInput.val ('#' + OV.ColorToHexString (edgesSettings.edgesColor));
    edgeColorInput.change (function () {
        let colorStr = edgeColorInput.val ().substr (1);
        edgesSettings.edgesColor = OV.HexStringToColor (colorStr);
    });

    let edgeAngleRow = $('<div>').addClass ('ov_dialog_table_row').appendTo (contentDiv);
    $('<div>').html ('Edges detection angle').addClass ('ov_dialog_table_row_name').appendTo (edgeAngleRow);
    let eaValueColumn = $('<div>').addClass ('ov_dialog_table_row_value').appendTo (edgeAngleRow);
    let edgeAngleInput = $('<input>').attr ('type', 'text').addClass ('ov_dialog_inner_title').appendTo (eaValueColumn);
    $('<span>').addClass ('ov_dialog_table_row_comment').html ('(Edge detection angle)').appendTo (eaValueColumn);
    edgeAngleInput.val (edgesSettings.edgesAngle);
    edgeAngleInput.change (function () {
        edgesSettings.edgesAngle = edgeAngleInput.val ();
    });


    dialog.Show ();
    return dialog;
};
