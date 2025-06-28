// "use client";

// import type React from "react";

// import { useState, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   AlertTriangle,
//   FileVideo,
//   X,
//   Check,
//   ArrowRight,
//   Upload,
//   LinkIcon,
// } from "lucide-react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Label } from "@/components/ui/label";
// import { Progress } from "@/components/ui/progress";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Input } from "@/components/ui/input";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// // Update the component to include URL submission functionality
// export default function UploadPage() {
//   const router = useRouter();
//   const [isDragging, setIsDragging] = useState(false);
//   const [files, setFiles] = useState<
//     Array<{
//       file: File;
//       priority: string;
//       s3Key?: string;
//       s3Bucket?: string;
//       publicUrl?: string;
//     }>
//   >([]);
//   const [uploadProgress, setUploadProgress] = useState<{
//     [key: number]: number;
//   }>({});
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadComplete, setUploadComplete] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   // New state for URL submission
//   const [videoUrl, setVideoUrl] = useState("");
//   const [videoName, setVideoName] = useState("");
//   const [urlPriority, setUrlPriority] = useState("medium");
//   const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
//   const [urlSubmitComplete, setUrlSubmitComplete] = useState(false);
//   const [urlError, setUrlError] = useState<string | null>(null);
//   const [activeTab, setActiveTab] = useState("upload-file");

//   // Rest of the existing file upload functions remain the same
//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragging(true);
//   };

//   const handleDragLeave = () => {
//     setIsDragging(false);
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragging(false);

//     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
//       handleFiles(e.dataTransfer.files);
//     }
//   };

//   const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files.length > 0) {
//       handleFiles(e.target.files);
//     }
//   };

//   const handleFiles = (fileList: FileList) => {
//     const newFiles: Array<{
//       file: File;
//       priority: string;
//     }> = [];

//     // Accept all video file types
//     for (let i = 0; i < fileList.length; i++) {
//       const file = fileList[i];

//       // Check if it's a video file
//       if (
//         file.type.startsWith("video/") ||
//         file.name.toLowerCase().endsWith(".mp4") ||
//         file.name.toLowerCase().endsWith(".mkv") ||
//         file.name.toLowerCase().endsWith(".mov") ||
//         file.name.toLowerCase().endsWith(".avi")
//       ) {
//         newFiles.push({
//           file,
//           priority: "medium", // Default priority
//         });
//       } else {
//         console.warn(`File ${file.name} is not a supported video format`);
//       }
//     }

//     if (newFiles.length === 0) {
//       alert(
//         "No valid video files were selected. Supported formats include MP4, MKV, MOV, and AVI."
//       );
//       return;
//     }

//     setFiles((prev) => [...prev, ...newFiles]);
//   };

//   const removeFile = (index: number) => {
//     setFiles((prev) => prev.filter((_, i) => i !== index));
//     // Also remove from uploadProgress if it exists
//     if (uploadProgress[index]) {
//       setUploadProgress((prev) => {
//         const newProgress = { ...prev };
//         delete newProgress[index];
//         return newProgress;
//       });
//     }
//   };

//   const handleUpload = async () => {
//     if (files.length === 0) return;

//     setIsUploading(true);
//     setError(null);

//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         throw new Error("Authentication token not found");
//       }

//       const userId = localStorage.getItem("userId") || "unknown";
//       const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "";

//       if (!bucketName) {
//         throw new Error("S3 bucket name is not configured");
//       }

//       // Upload each file
//       for (let i = 0; i < files.length; i++) {
//         const fileObj = files[i];
//         setUploadProgress((prev) => ({ ...prev, [i]: 0 }));

//         try {
//           console.log(`Starting direct upload for file: ${fileObj.file.name}`);

//           // Create a unique key for the S3 object
//           const timestamp = Date.now();
//           const key = `uploads/user-${userId}/${timestamp}-${fileObj.file.name}`;

//           // Create a public URL for the object
//           const publicUrl = `https://${bucketName}.s3.${
//             process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1"
//           }.amazonaws.com/${key}`;

//           // Upload directly to S3
//           await uploadToS3Direct(bucketName, key, fileObj.file, (progress) => {
//             setUploadProgress((prev) => ({ ...prev, [i]: progress }));
//           });

//           console.log(`Successfully uploaded ${fileObj.file.name} to S3`);

//           // Create a video record in our database
//           const videoData = {
//             name: fileObj.file.name,
//             priority: fileObj.priority,
//             publicUrl: publicUrl,
//           };

//           console.log(
//             `Creating video record in database for ${fileObj.file.name}`
//           );

//           // Use fetch with text() instead of json() first to safely handle the response
//           const createVideoResponse = await fetch("/api/videos", {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${token}`,
//             },
//             body: JSON.stringify(videoData),
//           });

//           // First get the raw text response
//           const responseText = await createVideoResponse.text();

//           if (!createVideoResponse.ok) {
//             // Try to parse as JSON if possible, otherwise use the raw text
//             let errorMessage = `Failed to create video record: ${createVideoResponse.status}`;

//             try {
//               if (responseText) {
//                 const errorData = JSON.parse(responseText);
//                 if (errorData.error) {
//                   errorMessage = errorData.error;
//                 }
//               }
//             } catch (e) {
//               // If parsing fails, use the raw response text if available
//               if (responseText) {
//                 errorMessage = `Server response: ${responseText}`;
//               }
//             }

//             throw new Error(errorMessage);
//           }

//           // Parse the response as JSON only if we know it succeeded
//           let videoRecord;
//           try {
//             videoRecord = JSON.parse(responseText);
//           } catch (e) {
//             console.warn("Could not parse video record response as JSON:", e);
//             // Continue anyway since the upload succeeded
//             videoRecord = { id: "unknown" };
//           }

//           console.log(
//             `Video record created with ID: ${videoRecord.id || "unknown"}`
//           );

//           // Update file with S3 info
//           setFiles((prev) =>
//             prev.map((f, idx) =>
//               idx === i
//                 ? {
//                     ...f,
//                     s3Key: key,
//                     s3Bucket: bucketName,
//                     publicUrl: publicUrl,
//                   }
//                 : f
//             )
//           );

//           // Update progress to 100%
//           setUploadProgress((prev) => ({ ...prev, [i]: 100 }));
//         } catch (error) {
//           console.error(`Error uploading file ${fileObj.file.name}:`, error);
//           // Set progress to show error
//           setUploadProgress((prev) => ({ ...prev, [i]: -1 }));
//           setError(
//             `Error uploading ${fileObj.file.name}: ${
//               error instanceof Error ? error.message : String(error)
//             }`
//           );
//         }
//       }

//       // Check if all files are uploaded successfully
//       const allUploaded = Object.values(uploadProgress).every((p) => p === 100);
//       if (allUploaded) {
//         setUploadComplete(true);
//       }
//     } catch (error) {
//       console.error("Upload error:", error);
//       setError(
//         `An error occurred during upload: ${
//           error instanceof Error ? error.message : String(error)
//         }`
//       );
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   // Function to upload file directly to S3 with progress tracking
//   const uploadToS3Direct = async (
//     bucket: string,
//     key: string,
//     file: File,
//     onProgress: (progress: number) => void
//   ) => {
//     return new Promise<void>((resolve, reject) => {
//       const xhr = new XMLHttpRequest();

//       xhr.upload.addEventListener("progress", (event) => {
//         if (event.lengthComputable) {
//           const percentComplete = Math.round(
//             (event.loaded / event.total) * 100
//           );
//           onProgress(percentComplete);
//         }
//       });

//       xhr.addEventListener("load", () => {
//         if (xhr.status >= 200 && xhr.status < 300) {
//           onProgress(100);
//           resolve();
//         } else {
//           console.error(`Upload failed with status ${xhr.status}`);
//           let errorMessage = `Upload failed with status ${xhr.status}`;

//           // Try to extract more information from the response if available
//           if (xhr.responseText) {
//             errorMessage += `: ${xhr.responseText}`;
//           }

//           reject(new Error(errorMessage));
//         }
//       });

//       xhr.addEventListener("error", (e) => {
//         console.error("XHR error during upload:", e);
//         reject(new Error("Network error occurred during the upload"));
//       });

//       xhr.addEventListener("abort", () => {
//         reject(new Error("Upload aborted"));
//       });

//       // Direct upload to S3
//       const url = `https://${bucket}.s3.${
//         process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1"
//       }.amazonaws.com/${key}`;

//       console.log(`Uploading to URL: ${url}`);
//       xhr.open("PUT", url);

//       // Set content type
//       xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

//       // Send the file
//       xhr.send(file);
//     });
//   };

//   const resetUpload = () => {
//     setFiles([]);
//     setUploadProgress({});
//     setUploadComplete(false);
//     setError(null);
//   };

//   const updateFilePriority = (index: number, priority: string) => {
//     setFiles((prev) =>
//       prev.map((fileObj, i) =>
//         i === index ? { ...fileObj, priority } : fileObj
//       )
//     );
//   };

//   // New function to handle URL submission
//   const handleUrlSubmit = async () => {
//     if (!videoUrl) {
//       setUrlError("Please enter a video URL");
//       return;
//     }

//     setIsSubmittingUrl(true);
//     setUrlError(null);

//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         throw new Error("Authentication token not found");
//       }

//       // Prepare the data to send to the Lambda function
//       const urlData = {
//         url: videoUrl,
//         filename: videoName || extractFilenameFromUrl(videoUrl),
//         priority: urlPriority,
//         metadata: {
//           userId: localStorage.getItem("userId") || "unknown",
//           userEmail: localStorage.getItem("userEmail") || "unknown",
//         },
//       };

//       // Send the URL to the Lambda function
//       const lambdaEndpoint =
//         process.env.NEXT_PUBLIC_VIDEO_URL_LAMBDA_ENDPOINT || "/api/video-url";
//       console.log(lambdaEndpoint);

//       const response = await fetch(lambdaEndpoint, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(urlData),
//       });

//       if (!response.ok) {
//         const errorData = await response
//           .json()
//           .catch(() => ({ error: "Unknown error" }));
//         throw new Error(
//           errorData.error || `Server responded with status ${response.status}`
//         );
//       }

//       const result = await response.json();
//       console.log("URL submission successful:", result);

//       // Also create a record in our database
//       const videoData = {
//         name: videoName || extractFilenameFromUrl(videoUrl),
//         priority: urlPriority,
//         publicUrl: videoUrl,
//         source: "external_url",
//       };

//       await fetch("/api/videos", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(videoData),
//       });

//       setUrlSubmitComplete(true);
//     } catch (error) {
//       console.error("URL submission error:", error);
//       setUrlError(
//         `Error submitting URL: ${
//           error instanceof Error ? error.message : String(error)
//         }`
//       );
//     } finally {
//       setIsSubmittingUrl(false);
//     }
//   };

//   // Helper function to extract filename from URL
//   const extractFilenameFromUrl = (url: string): string => {
//     try {
//       const urlObj = new URL(url);
//       const pathname = urlObj.pathname;
//       const segments = pathname.split("/");
//       const lastSegment = segments[segments.length - 1];

//       // If the last segment has a file extension, use it as the filename
//       if (lastSegment && lastSegment.includes(".")) {
//         return lastSegment;
//       }

//       // Otherwise, use a generic name with the current timestamp
//       return `video-${Date.now()}`;
//     } catch (e) {
//       // If URL parsing fails, return a generic name
//       return `video-${Date.now()}`;
//     }
//   };

//   const resetUrlForm = () => {
//     setVideoUrl("");
//     setVideoName("");
//     setUrlPriority("medium");
//     setUrlSubmitComplete(false);
//     setUrlError(null);
//   };

//   return (
//     <div className="flex flex-col gap-4 md:gap-8">
//       <div className="flex flex-col gap-2">
//         <h1 className="text-3xl font-bold tracking-tight">Upload Videos</h1>
//         <p className="text-muted-foreground">
//           Upload your videos or submit video URLs for processing.
//         </p>
//       </div>

//       <Tabs
//         defaultValue="upload-file"
//         value={activeTab}
//         onValueChange={setActiveTab}
//         className="w-full"
//       >
//         <TabsList className="grid w-full grid-cols-2">
//           <TabsTrigger value="upload-file">Upload File</TabsTrigger>
//           <TabsTrigger value="submit-url">Submit URL</TabsTrigger>
//         </TabsList>

//         <TabsContent value="upload-file">
//           {error && (
//             <Alert variant="destructive" className="mb-4">
//               <AlertTriangle className="h-4 w-4" />
//               <AlertTitle>Error</AlertTitle>
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}

//           {uploadComplete ? (
//             <Card>
//               <CardContent className="pt-6">
//                 <div className="flex flex-col items-center justify-center text-center p-6">
//                   <div className="rounded-full bg-primary/10 p-3 mb-4">
//                     <Check className="h-8 w-8 text-primary" />
//                   </div>
//                   <h2 className="text-2xl font-bold mb-2">Upload Complete!</h2>
//                   <p className="text-muted-foreground mb-6">
//                     {files.length === 1
//                       ? "Your video has been uploaded successfully and is now being processed."
//                       : `All ${files.length} videos have been uploaded successfully and are now being processed.`}
//                   </p>
//                   <div className="flex flex-col sm:flex-row gap-4">
//                     <Button onClick={resetUpload} variant="outline">
//                       Upload More Videos
//                     </Button>
//                     <Button onClick={() => router.push("/dashboard/videos")}>
//                       Go to My Videos
//                       <ArrowRight className="ml-2 h-4 w-4" />
//                     </Button>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ) : (
//             <>
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Upload Video Files</CardTitle>
//                   <CardDescription>
//                     Drag and drop your video files or click to browse
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <div
//                     className={`border-2 border-dashed rounded-lg p-8 text-center ${
//                       isDragging
//                         ? "border-primary bg-primary/5"
//                         : "border-muted-foreground/25"
//                     } cursor-pointer`}
//                     onDragOver={handleDragOver}
//                     onDragLeave={handleDragLeave}
//                     onDrop={handleDrop}
//                     onClick={() => fileInputRef.current?.click()}
//                   >
//                     <input
//                       type="file"
//                       ref={fileInputRef}
//                       className="hidden"
//                       accept="video/*,.mp4,.mkv,.mov,.avi"
//                       multiple
//                       onChange={handleFileInputChange}
//                     />
//                     <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
//                       <Upload className="h-10 w-10 text-muted-foreground" />
//                       <h3 className="mt-4 text-lg font-semibold">
//                         Drag & Drop Video Files
//                       </h3>
//                       <p className="mb-4 mt-2 text-sm text-muted-foreground">
//                         Drag and drop your video files here, or click to browse
//                         your files
//                       </p>
//                       <p className="text-xs text-muted-foreground">
//                         Supported formats: MP4, MKV, MOV, AVI
//                       </p>
//                     </div>
//                   </div>

//                   {files.length > 0 && (
//                     <div className="mt-6">
//                       <div className="flex items-center justify-between mb-4">
//                         <h3 className="font-medium">
//                           Files to upload ({files.length})
//                         </h3>
//                         <Button
//                           onClick={handleUpload}
//                           disabled={isUploading || files.length === 0}
//                         >
//                           {isUploading ? "Uploading..." : "Start Upload"}
//                         </Button>
//                       </div>

//                       <div className="space-y-4">
//                         {files.map((fileObj, index) => (
//                           <div
//                             key={index}
//                             className="flex items-center gap-4 rounded-lg border p-4"
//                           >
//                             <FileVideo className="h-8 w-8 text-muted-foreground" />
//                             <div className="flex-1 space-y-1">
//                               <div className="flex items-center justify-between">
//                                 <p className="font-medium">
//                                   {fileObj.file.name}
//                                 </p>
//                                 <p className="text-sm text-muted-foreground">
//                                   {(fileObj.file.size / (1024 * 1024)).toFixed(
//                                     2
//                                   )}{" "}
//                                   MB
//                                 </p>
//                               </div>
//                               <div className="flex items-center gap-2">
//                                 <Label
//                                   htmlFor={`priority-${index}`}
//                                   className="text-xs"
//                                 >
//                                   Priority:
//                                 </Label>
//                                 <Select
//                                   value={fileObj.priority}
//                                   onValueChange={(value) =>
//                                     updateFilePriority(index, value)
//                                   }
//                                   disabled={isUploading}
//                                 >
//                                   <SelectTrigger className="h-7 w-[100px]">
//                                     <SelectValue placeholder="Select priority" />
//                                   </SelectTrigger>
//                                   <SelectContent>
//                                     <SelectItem value="high">High</SelectItem>
//                                     <SelectItem value="medium">
//                                       Medium
//                                     </SelectItem>
//                                     <SelectItem value="low">Low</SelectItem>
//                                   </SelectContent>
//                                 </Select>
//                               </div>
//                               {uploadProgress[index] !== undefined && (
//                                 <div className="space-y-1">
//                                   <div className="flex items-center justify-between text-xs">
//                                     {uploadProgress[index] === -1 ? (
//                                       <span className="text-destructive flex items-center">
//                                         <AlertTriangle className="h-3 w-3 mr-1" />{" "}
//                                         Upload failed
//                                       </span>
//                                     ) : (
//                                       <>
//                                         <span>
//                                           Uploading: {uploadProgress[index]}%
//                                         </span>
//                                         {uploadProgress[index] === 100 && (
//                                           <span className="text-green-500 flex items-center">
//                                             <Check className="h-3 w-3 mr-1" />{" "}
//                                             Complete
//                                           </span>
//                                         )}
//                                       </>
//                                     )}
//                                   </div>
//                                   {uploadProgress[index] !== -1 && (
//                                     <Progress
//                                       value={uploadProgress[index]}
//                                       className="h-2"
//                                     />
//                                   )}
//                                 </div>
//                               )}
//                             </div>
//                             {!isUploading && (
//                               <Button
//                                 variant="ghost"
//                                 size="icon"
//                                 onClick={() => removeFile(index)}
//                                 className="ml-auto"
//                               >
//                                 <X className="h-4 w-4" />
//                                 <span className="sr-only">Remove</span>
//                               </Button>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>

//               <Alert>
//                 <AlertTriangle className="h-4 w-4" />
//                 <AlertTitle>Important</AlertTitle>
//                 <AlertDescription>
//                   Your S3 bucket has Object Ownership set to &quot;Bucket owner
//                   enforced&quot;. Make sure your bucket policy allows uploads
//                   and access to objects.
//                 </AlertDescription>
//               </Alert>
//             </>
//           )}
//         </TabsContent>

//         <TabsContent value="submit-url">
//           {urlError && (
//             <Alert variant="destructive" className="mb-4">
//               <AlertTriangle className="h-4 w-4" />
//               <AlertTitle>Error</AlertTitle>
//               <AlertDescription>{urlError}</AlertDescription>
//             </Alert>
//           )}

//           {urlSubmitComplete ? (
//             <Card>
//               <CardContent className="pt-6">
//                 <div className="flex flex-col items-center justify-center text-center p-6">
//                   <div className="rounded-full bg-primary/10 p-3 mb-4">
//                     <Check className="h-8 w-8 text-primary" />
//                   </div>
//                   <h2 className="text-2xl font-bold mb-2">
//                     URL Submitted Successfully!
//                   </h2>
//                   <p className="text-muted-foreground mb-6">
//                     Your video URL has been submitted and will be processed
//                     shortly.
//                   </p>
//                   <div className="flex flex-col sm:flex-row gap-4">
//                     <Button onClick={resetUrlForm} variant="outline">
//                       Submit Another URL
//                     </Button>
//                     <Button onClick={() => router.push("/dashboard/videos")}>
//                       Go to My Videos
//                       <ArrowRight className="ml-2 h-4 w-4" />
//                     </Button>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ) : (
//             <Card>
//               <CardHeader>
//                 <CardTitle>Submit Video URL</CardTitle>
//                 <CardDescription>
//                   Enter the URL of a video that's already hosted on a public
//                   cloud
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div className="space-y-2">
//                     <Label htmlFor="video-url">Video URL</Label>
//                     <Input
//                       id="video-url"
//                       type="url"
//                       placeholder="https://example.com/path/to/video.mp4"
//                       value={videoUrl}
//                       onChange={(e) => setVideoUrl(e.target.value)}
//                       disabled={isSubmittingUrl}
//                       required
//                     />
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="video-name">
//                       Video Name{" "}
//                       <span className="text-muted-foreground">(Optional)</span>
//                     </Label>
//                     <Input
//                       id="video-name"
//                       placeholder="Enter a name for this video"
//                       value={videoName}
//                       onChange={(e) => setVideoName(e.target.value)}
//                       disabled={isSubmittingUrl}
//                     />
//                     <p className="text-xs text-muted-foreground">
//                       If left blank, the filename will be extracted from the URL
//                     </p>
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="url-priority">Priority</Label>
//                     <Select
//                       value={urlPriority}
//                       onValueChange={setUrlPriority}
//                       disabled={isSubmittingUrl}
//                     >
//                       <SelectTrigger id="url-priority">
//                         <SelectValue placeholder="Select priority" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="high">High</SelectItem>
//                         <SelectItem value="medium">Medium</SelectItem>
//                         <SelectItem value="low">Low</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <Button
//                     className="w-full mt-4"
//                     onClick={handleUrlSubmit}
//                     disabled={isSubmittingUrl || !videoUrl}
//                   >
//                     {isSubmittingUrl ? "Submitting..." : "Submit URL"}
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           )}

//           <Alert className="mt-4">
//             <LinkIcon className="h-4 w-4" />
//             <AlertTitle>Note</AlertTitle>
//             <AlertDescription>
//               The URL must be publicly accessible. The video will be downloaded
//               and processed by our system.
//             </AlertDescription>
//           </Alert>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
"use client";

import type React from "react";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  FileVideo,
  X,
  Check,
  ArrowRight,
  Upload,
  LinkIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Update the component to include URL submission functionality
export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<
    Array<{
      id: string;
      file: File;
      priority: string;
      s3Key?: string;
      s3Bucket?: string;
      publicUrl?: string;
    }>
  >([]);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: number]: number;
  }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for URL submission
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [urlPriority, setUrlPriority] = useState("medium");
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [urlSubmitComplete, setUrlSubmitComplete] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload-file");

  // Rest of the existing file upload functions remain the same
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const newFiles: Array<{
      id: string;
      file: File;
      priority: string;
    }> = [];

    // Accept all video file types
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Check if it's a video file
      if (
        file.type.startsWith("video/") ||
        file.name.toLowerCase().endsWith(".mp4") ||
        file.name.toLowerCase().endsWith(".mkv") ||
        file.name.toLowerCase().endsWith(".mov") ||
        file.name.toLowerCase().endsWith(".avi")
      ) {
        newFiles.push({
          id: uuidv4(), // Generate a UUID for each file
          file,
          priority: "medium", // Default priority
        });
      } else {
        console.warn(`File ${file.name} is not a supported video format`);
      }
    }

    if (newFiles.length === 0) {
      alert(
        "No valid video files were selected. Supported formats include MP4, MKV, MOV, and AVI."
      );
      return;
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    // Also remove from uploadProgress if it exists
    if (uploadProgress[index]) {
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[index];
        return newProgress;
      });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "";

      if (!bucketName) {
        throw new Error("S3 bucket name is not configured");
      }

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        setUploadProgress((prev) => ({ ...prev, [i]: 0 }));

        try {
          console.log(`Starting direct upload for file: ${fileObj.file.name}`);

          // Use the UUID directly as the S3 key
          const key = "uploads/" + fileObj.id + "/" + fileObj.file.name;

          // Create a public URL for the object
          const publicUrl = `https://${bucketName}.s3.${
            process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1"
          }.amazonaws.com/${key}`;

          // Upload directly to S3
          await uploadToS3Direct(bucketName, key, fileObj.file, (progress) => {
            setUploadProgress((prev) => ({ ...prev, [i]: progress }));
          });

          console.log(
            `Successfully uploaded ${fileObj.file.name} to S3 with key ${key}`
          );

          // Create a video record in our database
          const videoData = {
            id: fileObj.id, // Use the UUID we generated
            name: fileObj.file.name,
            priority: fileObj.priority,
            publicUrl: publicUrl,
          };

          console.log(
            `Creating video record in database for ${fileObj.file.name}`
          );

          // Use fetch with text() instead of json() first to safely handle the response
          const createVideoResponse = await fetch("/api/videos", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(videoData),
          });

          // First get the raw text response
          const responseText = await createVideoResponse.text();

          if (!createVideoResponse.ok) {
            // Try to parse as JSON if possible, otherwise use the raw text
            let errorMessage = `Failed to create video record: ${createVideoResponse.status}`;

            try {
              if (responseText) {
                const errorData = JSON.parse(responseText);
                if (errorData.error) {
                  errorMessage = errorData.error;
                }
              }
            } catch (e) {
              // If parsing fails, use the raw response text if available
              if (responseText) {
                errorMessage = `Server response: ${responseText}`;
              }
            }

            throw new Error(errorMessage);
          }

          // Parse the response as JSON only if we know it succeeded
          let videoRecord;
          try {
            videoRecord = JSON.parse(responseText);
          } catch (e) {
            console.warn("Could not parse video record response as JSON:", e);
            // Continue anyway since the upload succeeded
            videoRecord = { id: fileObj.id };
          }

          console.log(
            `Video record created with ID: ${videoRecord.id || fileObj.id}`
          );

          // Update file with S3 info
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? {
                    ...f,
                    s3Key: key,
                    s3Bucket: bucketName,
                    publicUrl: publicUrl,
                  }
                : f
            )
          );

          // Update progress to 100%
          setUploadProgress((prev) => ({ ...prev, [i]: 100 }));
        } catch (error) {
          console.error(`Error uploading file ${fileObj.file.name}:`, error);
          // Set progress to show error
          setUploadProgress((prev) => ({ ...prev, [i]: -1 }));
          setError(
            `Error uploading ${fileObj.file.name}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Check if all files are uploaded successfully
      const allUploaded = Object.values(uploadProgress).every((p) => p === 100);
      if (allUploaded) {
        setUploadComplete(true);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError(
        `An error occurred during upload: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Function to upload file directly to S3 with progress tracking
  const uploadToS3Direct = async (
    bucket: string,
    key: string,
    file: File,
    onProgress: (progress: number) => void
  ) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100
          );
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          console.error(`Upload failed with status ${xhr.status}`);
          let errorMessage = `Upload failed with status ${xhr.status}`;

          // Try to extract more information from the response if available
          if (xhr.responseText) {
            errorMessage += `: ${xhr.responseText}`;
          }

          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener("error", (e) => {
        console.error("XHR error during upload:", e);
        reject(new Error("Network error occurred during the upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      // Direct upload to S3
      const url = `https://${bucket}.s3.${
        process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1"
      }.amazonaws.com/${key}`;

      console.log(`Uploading to URL: ${url}`);
      xhr.open("PUT", url);

      // Set content type
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

      // Send the file
      xhr.send(file);
    });
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadProgress({});
    setUploadComplete(false);
    setError(null);
  };

  const updateFilePriority = (index: number, priority: string) => {
    setFiles((prev) =>
      prev.map((fileObj, i) =>
        i === index ? { ...fileObj, priority } : fileObj
      )
    );
  };

  // New function to handle URL submission
  const handleUrlSubmit = async () => {
    if (!videoUrl) {
      setUrlError("Please enter a video URL");
      return;
    }

    setIsSubmittingUrl(true);
    setUrlError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Generate a UUID for this video
      const videoId = uuidv4();

      // Prepare the data to send to the Lambda function
      const urlData = {
        id: videoId,
        url: videoUrl,
        filename: videoName || extractFilenameFromUrl(videoUrl),
        priority: urlPriority,
        metadata: {
          userId: localStorage.getItem("userId") || "unknown",
          userEmail: localStorage.getItem("userEmail") || "unknown",
        },
      };

      // Send the URL to the Lambda function
      const lambdaEndpoint =
        process.env.NEXT_PUBLIC_VIDEO_URL_LAMBDA_ENDPOINT || "/api/video-url";
      const response = await fetch(lambdaEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(urlData),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `Server responded with status ${response.status}`
        );
      }

      const result = await response.json();
      console.log("URL submission successful:", result);

      // Also create a record in our database
      const videoData = {
        id: videoId,
        name: videoName || extractFilenameFromUrl(videoUrl),
        priority: urlPriority,
        publicUrl: videoUrl,
        source: "external_url",
      };

      await fetch("/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(videoData),
      });

      setUrlSubmitComplete(true);
    } catch (error) {
      console.error("URL submission error:", error);
      setUrlError(
        `Error submitting URL: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  // Helper function to extract filename from URL
  const extractFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split("/");
      const lastSegment = segments[segments.length - 1];

      // If the last segment has a file extension, use it as the filename
      if (lastSegment && lastSegment.includes(".")) {
        return lastSegment;
      }

      // Otherwise, use a generic name with the current timestamp
      return `video-${Date.now()}`;
    } catch (e) {
      // If URL parsing fails, return a generic name
      return `video-${Date.now()}`;
    }
  };

  const resetUrlForm = () => {
    setVideoUrl("");
    setVideoName("");
    setUrlPriority("medium");
    setUrlSubmitComplete(false);
    setUrlError(null);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload Videos</h1>
        <p className="text-muted-foreground">
          Upload your videos or submit video URLs for processing.
        </p>
      </div>

      <Tabs
        defaultValue="upload-file"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload-file">Upload File</TabsTrigger>
          <TabsTrigger value="submit-url">Submit URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload-file">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {uploadComplete ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Upload Complete!</h2>
                  <p className="text-muted-foreground mb-6">
                    {files.length === 1
                      ? "Your video has been uploaded successfully and is now being processed."
                      : `All ${files.length} videos have been uploaded successfully and are now being processed.`}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={resetUpload} variant="outline">
                      Upload More Videos
                    </Button>
                    <Button onClick={() => router.push("/dashboard/videos")}>
                      Go to My Videos
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Upload Video Files</CardTitle>
                  <CardDescription>
                    Drag and drop your video files or click to browse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25"
                    } cursor-pointer`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="video/*,.mp4,.mkv,.mov,.avi"
                      multiple
                      onChange={handleFileInputChange}
                    />
                    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">
                        Drag & Drop Video Files
                      </h3>
                      <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        Drag and drop your video files here, or click to browse
                        your files
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: MP4, MKV, MOV, AVI
                      </p>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">
                          Files to upload ({files.length})
                        </h3>
                        <Button
                          onClick={handleUpload}
                          disabled={isUploading || files.length === 0}
                        >
                          {isUploading ? "Uploading..." : "Start Upload"}
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {files.map((fileObj, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-4 rounded-lg border p-4"
                          >
                            <FileVideo className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">
                                  {fileObj.file.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {(fileObj.file.size / (1024 * 1024)).toFixed(
                                    2
                                  )}{" "}
                                  MB
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor={`priority-${index}`}
                                  className="text-xs"
                                >
                                  Priority:
                                </Label>
                                <Select
                                  value={fileObj.priority}
                                  onValueChange={(value) =>
                                    updateFilePriority(index, value)
                                  }
                                  disabled={isUploading}
                                >
                                  <SelectTrigger className="h-7 w-[100px]">
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">
                                      Medium
                                    </SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {uploadProgress[index] !== undefined && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    {uploadProgress[index] === -1 ? (
                                      <span className="text-destructive flex items-center">
                                        <AlertTriangle className="h-3 w-3 mr-1" />{" "}
                                        Upload failed
                                      </span>
                                    ) : (
                                      <>
                                        <span>
                                          Uploading: {uploadProgress[index]}%
                                        </span>
                                        {uploadProgress[index] === 100 && (
                                          <span className="text-green-500 flex items-center">
                                            <Check className="h-3 w-3 mr-1" />{" "}
                                            Complete
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {uploadProgress[index] !== -1 && (
                                    <Progress
                                      value={uploadProgress[index]}
                                      className="h-2"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                            {!isUploading && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFile(index)}
                                className="ml-auto"
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Your S3 bucket has Object Ownership set to &quot;Bucket owner
                  enforced&quot;. Make sure your bucket policy allows uploads
                  and access to objects.
                </AlertDescription>
              </Alert>
            </>
          )}
        </TabsContent>

        <TabsContent value="submit-url">
          {urlError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{urlError}</AlertDescription>
            </Alert>
          )}

          {urlSubmitComplete ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    URL Submitted Successfully!
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Your video URL has been submitted and will be processed
                    shortly.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={resetUrlForm} variant="outline">
                      Submit Another URL
                    </Button>
                    <Button onClick={() => router.push("/dashboard/videos")}>
                      Go to My Videos
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Submit Video URL</CardTitle>
                <CardDescription>
                  Enter the URL of a video that's already hosted on a public
                  cloud
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="video-url">Video URL</Label>
                    <Input
                      id="video-url"
                      type="url"
                      placeholder="https://example.com/path/to/video.mp4"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      disabled={isSubmittingUrl}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video-name">
                      Video Name{" "}
                      <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Input
                      id="video-name"
                      placeholder="Enter a name for this video"
                      value={videoName}
                      onChange={(e) => setVideoName(e.target.value)}
                      disabled={isSubmittingUrl}
                    />
                    <p className="text-xs text-muted-foreground">
                      If left blank, the filename will be extracted from the URL
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url-priority">Priority</Label>
                    <Select
                      value={urlPriority}
                      onValueChange={setUrlPriority}
                      disabled={isSubmittingUrl}
                    >
                      <SelectTrigger id="url-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full mt-4"
                    onClick={handleUrlSubmit}
                    disabled={isSubmittingUrl || !videoUrl}
                  >
                    {isSubmittingUrl ? "Submitting..." : "Submit URL"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Alert className="mt-4">
            <LinkIcon className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              The URL must be publicly accessible. The video will be downloaded
              and processed by our system.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
