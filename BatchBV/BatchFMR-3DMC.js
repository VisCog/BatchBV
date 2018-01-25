
// Variables (FMR Creation)
var projectName = "MB-01Dec2017"; // template project name
var mainDir = BrainVoyagerQX.BrowseDirectory("Select Subject Directory");

 //  Regular Expression Patterns
var functionalPattern = "Loc\\d+|Set\\d+"; // functional scan pattern (localizer and set)
var fmrCoregPattern = "fmrCoreg"; // FMR coregistration pattern
var opePattern = "OPE"; // opposite phase encoding pattern
var dirRE = new RegExp(functionalPattern+ "|" + fmrCoregPattern + "|" + opePattern); // directories
var correctionRE = new RegExp(fmrCoregPattern + "|" + opePattern); // correction scan regular expressions

// Directories
var dir = new QDir(mainDir); // search main directory
var filter = new QDir.Filters(QDir.Dirs); // keep only directories
var subDir = dir.entryList(filter); // filter to keep only directories

// Find FMR Directories for Processing
var processDir = []; // initialize array
for (var i = 0; i < subDir.length; i++) {
	if (dirRE.test(subDir[i])) { 
		processDir.push(subDir[i]);
	 }
} 

// Locate PAR + REC Files
BrainVoyagerQX.PrintToLog("PROCESSING: Creating FMR Projects");
var fileFilter = new QDir.Filters(QDir.Files); // keep only files
for (var i = 0; i < processDir.length; i++) {
	var fmrDir = mainDir + "/" + processDir[i]; 
	var dir = new QDir(fmrDir); // search FMR directory
	var fileList = dir.entryList(fileFilter); // filter for files 
	for (var i2 = 0; i2 < fileList.length; i2++) { // loop through the files in directory to find PAR + REC files
		if (/PAR/.test(fileList[i2])) { var parFile = fileList[i2]; } // remove PAR file from fileList
		if (/REC/.test(fileList[i2])) { var recFile = fileList[i2]; } // remove REC file from fileList
	}
	var parInfo = extractPAR(fmrDir + "/" + parFile); // parInfo = [nVols, nSlices, nRows, nCols]
	var fmr = BrainVoyagerQX.CreateProjectFMR("PHILIPS_REC", fmrDir + "/" + recFile, parInfo.nVols, 
		0, true, parInfo.nSlices, processDir[i], false, parInfo.nRows, parInfo.nCols, 2, fmrDir); // create FMR
	// number of volumes to skip: 0, create AMR: true, swap bytes: false, number of bytes per pixel: 2
	fmr.TimeResolutionVerified = true; // verified time resolution
	var saveName = projectName + "_" + processDir[i];
	if (correctionRE.test(processDir[i])) {
		saveName = processDir[i];
	}
	fmr.SaveAs(fmrDir + "/" +  saveName + ".fmr"); // save FMR
	fmr.Close(); // close FMR
	BrainVoyagerQX.PrintToLog("Saved: " + fmrDir + "/" + saveName + ".fmr") 
}
BrainVoyagerQX.PrintToLog("COMPLETED: Batch FMR Creation!"); 

// Variables (3D Motion Correction)
var fmrCoreg = mainDir + "/" + fmrCoregPattern + "/" + fmrCoregPattern + ".fmr";
var re = new RegExp(functionalPattern); // functional scan regular expression pattern

// Extract Functional Scan Directories
var processDir = []; // initialize array
for (var i = 0; i < subDir.length; i++) {
	if (re.test(subDir[i])) { 
		processDir.push(subDir[i]);
	 }
} 

// Locate FMRs to 3D Motion Correct
BrainVoyagerQX.PrintToLog("PROCESSING: FMR 3D Motion Correction");
for (var i = 0; i < processDir.length; i++) {
	var fmrPath = mainDir + "/" + processDir[i] + "/" + projectName + "_" + processDir[i] + ".fmr";
	var fmr = BrainVoyagerQX.OpenDocument(fmrPath); 
	fmr.CorrectMotionTargetVolumeInOtherRunEx(fmrCoreg, 1, 2, false, 100, false, false);
	// target volume: 1, interpolation: trilinear / sinc (2), use full data set: false, max number of iterations: 100
	// generate movie: false, generate extended log file: false
	fmr.Close(); // close original FMR
} 
BrainVoyagerQX.PrintToLog("COMPLETED: Batch 3D Motion Correction!"); 

// Helper Functions
// readPARFile: converts line of text (PAR) file into a text array
function readPARFile(filePath) { // read txt files
	var file = new QFile(filePath); // create QFile object
	file.open(new QIODevice.OpenMode(QIODevice.ReadOnly)); // read only
	var txt = new QTextStream(file); // create QTextStream object

	var fileLines = []; // initialize fileLines
	var line = txt.readLine(); // read text line / initialize
	while (!/END OF DATA/g.test(line)) { // read until last PAR line
		fileLines.push(line); // assign text line into fileLines array
		var line = txt.readLine(); // read next text line
	}
	return fileLines; // return fileLines
}

// extractPAR: extracts header information from the PAR file
function extractPAR(filePath) {
	var data = readPARFile(filePath);
	for (var i = 0; i < data.length; i++) { 
		if (/number of slices/.test(data[i])) { var nSlices = parseInt(data[i].replace(/\D*/g, "")); }  // number of slices
		if (/number of dynamics/.test(data[i])) { var nVols = parseInt(data[i].replace(/\D*/g, "")); } // number of volumes
		if (/= IMAGE INFORMATION =/.test(data[i])) { // x and y resolution
			var info = data[i+3].split(/\s+/);
			var nRows = info[10];
			var nCols = info[11];
		}
	}
	return {nVols: nVols, nSlices: nSlices, nRows: nRows, nCols: nCols}; // return PAR information
}