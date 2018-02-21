
// Variables
var anatDir = "3DAnat";
var fmrCoregDir = "fmrCoreg";
var opeDir = ""; // empty string if no OPE 
var vtcSpace = "ACPC"; // "ACPC" or "TAL"

// Processing -------------------------------------------------------------------------------------------------------------------

// Directories
var mainDir = BrainVoyagerQX.BrowseDirectory("Select Session Directory");
var projectName = mainDir.split("/").pop();
var ifOPE = opeDir.length > 0;

// Locate FMR Directories
var fmrDirs = findFMRDirs(mainDir, anatDir);

// Create FMRs
for (var i = 0; i < fmrDirs.length; i++) {	
	createFMR(mainDir, fmrDirs[i]);
}

// Create and Process VMR
var fmrCoregPath = mainDir + "/" + fmrCoregDir + "/" + projectName + "_" + fmrCoregDir + ".fmr";
var vmrBase = processVMR(mainDir, anatDir, fmrCoregPath);

// Remove fmrCoreg Directory and OPE Directory (if exist)
fmrDirs.splice(fmrDirs.indexOf(fmrCoregDir), 1); // remove fmrCoreg directory
if (ifOPE) { 
	fmrDirs.splice(fmrDirs.indexOf(opeDir), 1); // remove ope directory
}

// FMR Motion Correction Preprocessing
for (var i = 0; i < fmrDirs.length; i++) {	
	var fmrPath = mainDir + "/" + fmrDirs[i] + "/" + projectName + "_" + fmrDirs[i] + ".fmr";
	fmrPath = fmr3DMCTS(fmrPath, fmrCoregPath);
	if (!ifOPE) {
		fmrPath = SCCAI(fmrPath);
		fmrPath = LTR_THPGLMF2c(fmrPath);
		createVTC(fmrPath, vmrBase, fmrCoregDir, vtcSpace);
	}
}

// Helper Functions ------------------------------------------------------------------------------------------------------------

// fmr3DMCTS: FMR preprocessing, 3D motion correction aligned to the give fmrCoreg
function fmr3DMCTS(fmrPath, fmrCoregPath) {
	var fmr = BrainVoyagerQX.OpenDocument(fmrPath);
	fmr.CorrectMotionTargetVolumeInOtherRunEx(fmrCoregPath, 1, 2, false, 100, false, false);
	// target volume: 1, interpolation: trilinear / sinc (2), use full data set: false, max number of iterations: 100
	// generate movie: false, generate extended log file: false
	var resultsName  = fmr.FileNameOfPreprocessdFMR;
	fmr.Close(); // close original FMR
	return resultsName;
}

// SCCAI: FMR preprocessing, slice scan time correction 
function SCCAI(fmrPath) {
	var fmr = BrainVoyagerQX.OpenDocument(fmrPath);
	fmr.CorrectSliceTiming(1, 1); // slice scan ordering: ascending-interleaved (1), interpolation: cubic spline (1)
	var resultsName  = fmr.FileNameOfPreprocessdFMR;
	fmr.Close(); // close FMR
	return resultsName;
}

// LTR_THPGLMF2c: FMR preprocessing, linear trend removal and temporal high pass filtering
// with GLM and Fourier at 2 cycles
function LTR_THPGLMF2c(fmrPath) {
	var fmr = BrainVoyagerQX.OpenDocument(fmrPath);
	fmr.TemporalHighPassFilterGLMFourier(2); // (2) numbers of cycles used as cutoff
	var resultsName  = fmr.FileNameOfPreprocessdFMR;
	fmr.Close(); // close FMR project
	return resultsName;
}

// createVTC: create VTC either in ACPC or TAL space
function createVTC(fmrPath, vmrBase, fmrCoregDir, vtcSpace) {
	var projectName = mainDir.split("/").pop();
	var fmrCoregName = projectName + "_" + fmrCoregDir;
	var vmrName = vmrBase.split("/").splice(-1);
	var iaPath = mainDir + "/" + fmrCoregDir + "/" + fmrCoregName + "-TO-" + vmrName + "_IA.trf"; // initial alignment 
	var faPath = mainDir + "/" + fmrCoregDir + "/" + fmrCoregName + "-TO-" + vmrName + "_FA.trf"; // fine alignment 

	var vmr = BrainVoyagerQX.OpenDocument(vmrBase + ".vmr"); // open base VMR
	vmr.ExtendedTALSpaceForVTCCreation = false; // turn off arbitrary sized tal bounding box
	if (/ACPC/i.test(vtcSpace)) { // VTC in ACPC space
		var savePath = fmrPath.replace(".fmr", "_aACPC.vtc");
		vmr.CreateVTCInACPCSpace(fmrPath, iaPath, faPath, acpcPath, savePath, 2, 3, 1, 100);
		// last numerical parameters - data type: float (2), resolution: 3x3x3 (3), interpolation: trilinear (1),
		// threshold intensity: 100 (default)
	} else { // VTC in TAL space
		var savePath = fmrPath.replace(".fmr", "_aTAL.vtc");
		vmr.CreateVTCInTALSpace(fmrPath, iaPath, faPath, acpcPath, talPath, savePath, 2, 3, 1, 100);
		// last numerical parameters - data type: float (2), resolution: 3x3x3 (3), interpolation: trilinear (1),
		// threshold intensity: 100 (default)
	}
	vmr.Close(); // close VMR
}

// processVMR: creates new VMR project, intensity inhomogenity correction, iso-voxel transformation, 
// sagittal orientation transformation, FMR to VMR coregistration, and ACPC and TAL transformation
function processVMR(mainDir, anatDir, fmrCoregPath) {
	var path = mainDir + "/" + anatDir;
	var projectName = mainDir.split("/").pop();
	var vmrName = path + "/" + projectName + "_MPRAGE";
	var recFile = findREC(path);
	createVMR(path + "/" + recFile, vmrName);
	vmrName = IIHC(vmrName); // intensity inhomogeneity correction
	vmrName = ISO(vmrName); // iso-voxel transformation
	vmrName = SAG(vmrName); // saggital orientation transformation
	FMRToVMRCoreg(vmrName, fmrCoregPath); // FMR to VMR coregistration 
	ACPCandTAL(vmrName); // ACPC and TAL transformation
	return vmrName;
}

// createVMR: VMR preprocessing, creates a new VMR project
function createVMR(recPath, vmrName) {
	var parPath = recPath.replace(".REC", ".PAR");
	var parInfo = extractPAR(parPath); // parInfo = [nVols, nSlices, nRows, nCols]
	var vmr = BrainVoyagerQX.CreateProjectVMR("PHILIPS_REC", recPath, parInfo.nSlices, 
                                                                         false, parInfo.nCols, parInfo.nRows, 2);
	vmr.SaveAs(vmrName + ".vmr");
}

// IIHC: VMR preprocessing, intensity inhomogeneity correction
function IIHC(vmrName) {
	var vmr = BrainVoyagerQX.ActiveDocument;
	vmr.CorrectIntensityInhomogeneities();
	vmr.Close();
	return vmrName + "_IIHC";
}

// ISO: VMR preprocessing, iso-voxel transformation
function ISO(vmrName) {
	var vmr = BrainVoyagerQX.OpenDocument(vmrName + ".vmr");;
	var ok = vmr.AutoTransformToIsoVoxel(3, vmrName + "_ISO.vmr");
	vmr.Close();
	if (ok) {
		vmrName += "_ISO";
	}
	return vmrName;
}

// SAG: VMR preprocessing, sagittal orientation transformation
function SAG(vmrName) {
	var vmr = BrainVoyagerQX.OpenDocument(vmrName + ".vmr");
	var ok = vmr.AutoTransformToSAG(vmrName + "_SAG.vmr");
	vmr.Close();
	if (ok) {
		vmrName += "_SAG";
	}
	return vmrName;
}

// FMRToVMRCoreg: FMR to VMR coregistration, aligns to the first volume in functional
function FMRToVMRCoreg(vmrName, fmrCoreg) {
	var vmr = BrainVoyagerQX.OpenDocument(vmrName + ".vmr");
	vmr.CoregisterFMRToVMR(fmrCoreg, 1);
	vmr.Close();
}

// ACPCandTAL: transforms VMR into ACPC and TAL space
function ACPCandTAL(vmrName) {
	var vmr = BrainVoyagerQX.OpenDocument(vmrName + ".vmr");
	vmr.AutoACPCAndTALTransformation();
	vmr.Close();
}

// createFMR: open PAR/REC files and creates FMR files
function createFMR(mainDir, fmrDir) {
	var path = mainDir + "/" + fmrDir;
	var saveName = mainDir.split("/").pop() + "_" + fmrDir;
	var recFile = findREC(path);
	var parFile = recFile.replace(".REC", ".PAR");
	var parInfo = extractPAR(path + "/" + parFile); // parInfo = [nVols, nSlices, nRows, nCols]
	var fmr = BrainVoyagerQX.CreateProjectFMR("PHILIPS_REC", path + "/" + recFile, parInfo.nVols, 
		0, true, parInfo.nSlices, saveName, false, parInfo.nRows, parInfo.nCols, 2, path); // create FMR
	// number of volumes to skip: 0, create AMR: true, swap bytes: false, number of bytes per pixel: 2
	fmr.TimeResolutionVerified = true; // verified time resolution
	fmr.SaveAs(path + "/" + saveName); // save FMR
	fmr.Close(); // close FMR 
}

// findFMRDirs: locates the functional dictories within a given subject session folder
function findFMRDirs(mainDir, anatDir) {
	var dir = new QDir(mainDir); // search main directory
	var filter = new QDir.Filters(QDir.Dirs); // keep only directories
	var fmrDirs = dir.entryList(filter); // filter to keep only directories
	fmrDirs.splice(fmrDirs.indexOf("."), 1); // removes "." directory
      fmrDirs.splice(fmrDirs.indexOf(".."), 1); // removes ".." directory
	fmrDirs.splice(fmrDirs.indexOf(anatDir), 1); // remove anatomical directory
	return fmrDirs;
}

// findREC: locates the REC file within a directory
function findREC(fmrDirs) {
	var dir = new QDir(fmrDirs); // search functional directory
	var fileFilter = new QDir.Filters(QDir.Files); // keep only files
	var fileList = dir.entryList(fileFilter); // filter for files 
	for (var i = 0; i < fileList.length; i++) {
		if (/REC/.test(fileList[i].split(".").splice(-1))) {
			return fileList[i];
		}
	}
	return "";
}

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