
/* NOTE: FMRs should be completely pre-processed */

// Variables
var anatName = "3DAnat"; // anatomical template name
var anatSteps = "_ISO_SAG_IIHC";
var fmrCoregName = "fmrCoreg"; // FMR coregistration template name 
var fmrSteps = "_3DMCTS_undist_SCCAI_LTR_THPGLMF2c"; // processed FMR steps
var mainDir = BrainVoyagerQX.BrowseDirectory("Select Subject Directory");

 //  Regular Expression Patterns
var functionalPattern = "Loc\\d+|Set\\d+"; // functional scan pattern (localizer and set)
var dirRE = new RegExp(functionalPattern); // directories regular expressions
var fmrRE = new RegExp(fmrSteps + ".fmr"); // FMR processing steps regular expressions

// Create Paths to VTC Required Files
var vmrBase = anatName + anatSteps;
var vmrPath = mainDir + "/" + anatName + "/" + vmrBase + ".vmr"; // base VMR
var iaPath = mainDir + "/" + fmrCoregName + "/" + fmrCoregName + "-TO-" + vmrBase + "_IA.trf"; // initial alignment 
var faPath = mainDir + "/" + fmrCoregName + "/" + fmrCoregName + "-TO-" + vmrBase + "_FA.trf"; // fine alignment 
var acpcPath = mainDir + "/" + anatName + "/" + vmrBase + "_ACPC.trf"; // acpc transformation file
var talPath = mainDir + "/" + anatName + "/" + vmrBase + "_ACPC.tal"; // tal transformation file

// Directories
var dir = new QDir(mainDir); // search main directory
var filter = new QDir.Filters(QDir.Dirs); // keep only directories
var subDir = dir.entryList(filter); // filter

// Find FMR Directories for Processing
var processDir = []; // initialize array
for (var i = 0; i < subDir.length; i++) {
	if (dirRE.test(subDir[i])) { 
		processDir.push(subDir[i]);
	 }
} 

// Process FMRs into VTCs
var fileFilter = new QDir.Filters(QDir.Files); // keep only files
var vmr = BrainVoyagerQX.OpenDocument(vmrPath); // open base VMR
vmr.ExtendedTALSpaceForVTCCreation = false; // turn off arbitrary sized tal bounding box
for (var i = 0; i < processDir.length; i++) {
	var fmrDir = mainDir + "/" + processDir[i];
	var dir = new QDir(fmrDir); // search FMR directory
	var fileList = dir.entryList(fileFilter); // filter for files 
	for (var i2 = 0; i2 < fileList.length; i2++) { // loop through the files in directory to find FMR file with processed steps
		if (fmrRE.test(fileList[i2])) { 
			var fmrPath = mainDir + "/"  + processDir[i] + "/" + fileList[i2];
			var fmrName = fmrPath.replace(".fmr", "");
			var savePath = fmrName + "_TAL.vtc";
		} 
	}
	vmr.CreateVTCInTALSpace(fmrPath, iaPath, faPath, acpcPath, talPath, savePath, 2, 3, 1, 100);
	// last numerical parameters - data type: float (2), resolution: 3x3x3 (3), interpolation: trilinear (1),
	// threshold intensity: 100 (default)
	BrainVoyagerQX.PrintToLog("Saved: " + savePath);
} 
vmr.Close(); // close VMR
BrainVoyagerQX.PrintToLog("COMPLETED: Batch VTC!");