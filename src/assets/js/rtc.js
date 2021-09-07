/**
 * @author Amir Sanni <amirsanni@gmail.com>
 * @date 6th January, 2020
 */
import h from './helpers.js';

window.addEventListener( 'load', () => {
    let room = h.getQString( location.href, 'room' );
    let username = sessionStorage.getItem( 'username' );

    let is_student=null;
    let is_teacher=null;
    let powertest=null;
    const urlString=window.location.href;
    const url = new URL(urlString);
    const searchParams = new URLSearchParams(url.search);
  

  

    if (searchParams.has('room')) {
        room=searchParams.get('room');
    }

    if (searchParams.has('username')) {
        username=searchParams.get('username');
    }
   
    if (searchParams.has('is_student')) {
        is_student=searchParams.get('is_student');
    }
    

    if (searchParams.has('powertest')) {
        powertest=searchParams.get('powertest');

    }

    if (searchParams.has('is_teacher')) {
        is_teacher=searchParams.get('is_teacher');

    }
    
    if(is_student!=null && is_student=='1'){
        console.log('is_student >>>> '+is_student); 
        console.log('powertest >>>> '+powertest); 
          
        document.getElementById("toggle-video").hidden = true;
        document.getElementById("toggle-mute").hidden = true;
        if(powertest!=null && powertest==0){
            document.getElementById("share-screen").hidden = true;
        }
        
        document.getElementById("record").hidden = true;
        document.getElementById("leave").hidden = true;
        
         
      
    }else  if(is_teacher!=null && is_teacher=='1'){
        console.log('is_teacher >>>> '+is_teacher); 
        document.getElementById("toggle-video").hidden = true;
        // document.getElementById("toggle-mute").hidden = true;
        document.getElementById("share-screen").hidden = true;
        // document.getElementById("record").hidden = true;
        document.getElementById("leave").hidden = true;

        // let a = document.getElementsByClassName("remote-video")[0];
        // a.style.display = "block"; 
      

}else {
        console.log('Inside Else>>>> '+is_student); 
        customLocalDiv();
        customTeacherDiv();
    }

   
    if (searchParams.has('reolad')) {
        document.querySelector( '#reload-div' ).attributes.removeNamedItem( 'hidden' );
    }
    else if ( !room ) {
        console.log('inside if>>> '+room);
        document.querySelector( '#room-create' ).attributes.removeNamedItem( 'hidden' );
    }

    else if ( !username ) {
        console.log('inside else if>>> '+username);
        document.querySelector( '#username-set' ).attributes.removeNamedItem( 'hidden' );
    }

    else {
        let commElem = document.getElementsByClassName( 'room-comm' );
        
        for ( let i = 0; i < commElem.length; i++ ) {
            commElem[i].attributes.removeNamedItem( 'hidden' );
        }

        var pc = [];

        let socket = io( '/stream' );

        var socketId = '';
        var myStream = '';
        var screen = '';
        var share_screen = '';
        var recordedStream = [];
        var mediaRecorder = '';

        //Get user video by default
        getAndSetUserStream();


        socket.on( 'connect', () => {
            //set socketId
            socketId = socket.io.engine.id;


            socket.emit( 'subscribe', {
                room: room,
                socketId: socketId
            } );


            socket.on( 'new user', ( data ) => {
                socket.emit( 'newUserStart', { to: data.socketId, sender: socketId } );
                pc.push( data.socketId );
                init( true, data.socketId );
            } );


            socket.on( 'newUserStart', ( data ) => {
                pc.push( data.sender );
                init( false, data.sender );
            } );


            socket.on( 'ice candidates', async ( data ) => {
                data.candidate ? await pc[data.sender].addIceCandidate( new RTCIceCandidate( data.candidate ) ) : '';
            } );


            socket.on( 'sdp', async ( data ) => {
                if ( data.description.type === 'offer' ) {
                    data.description ? await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) ) : '';

                    h.getUserFullMedia().then( async ( stream ) => {
                        if ( !document.getElementById( 'local' ).srcObject ) {
                            h.setLocalStream( stream );
                        }

                        //save my stream
                        myStream = stream;

        //                    if(is_teacher!=null && is_teacher=='1'){
        //                       var elem = document.getElementById( 'toggle-mute' );

        //   if ( myStream.getAudioTracks()[0].enabled ) {
         
        //     elem.classList.remove( 'fa-microphone-alt' );
        //     elem.classList.add( 'fa-microphone-alt-slash' );
        //     elem.setAttribute( 'title', 'Unmute' );

        //     myStream.getAudioTracks()[0].enabled = false;
        // }
        //                 }
                     
                        stream.getTracks().forEach( ( track ) => {
                            pc[data.sender].addTrack( track, stream );
                        } );

                        let answer = await pc[data.sender].createAnswer();

                        await pc[data.sender].setLocalDescription( answer );

                        socket.emit( 'sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId } );
                    } ).catch( ( e ) => {
                        console.error( e );
                    } );
                }

                else if ( data.description.type === 'answer' ) {
                    await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) );
                }
            } );


            socket.on( 'chat', ( data ) => {
                h.addChat( data, 'remote' );
            } );
        } );


        function getAndSetUserStream() {
            h.getUserFullMedia().then( ( stream ) => {
                //save my stream
                myStream = stream;

                h.setLocalStream( stream );
            } ).catch( ( e ) => {
                console.error( `stream error: ${ e }` );
            } );
        }


        function sendMsg( msg ) {
            let data = {
                room: room,
                msg: msg,
                sender: username
            };

            //emit chat message
            socket.emit( 'chat', data );

            //add localchat
            h.addChat( data, 'local' );
        }



        function init( createOffer, partnerName ) {
            pc[partnerName] = new RTCPeerConnection( h.getIceServer() );

            if ( share_screen && share_screen.getTracks().length ) {
                share_screen.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, share_screen );//should trigger negotiationneeded event
                } );
            }


            if ( screen && screen.getTracks().length ) {
                screen.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, screen );//should trigger negotiationneeded event
                } );
            }

            
            else if ( myStream ) {
                myStream.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, myStream );//should trigger negotiationneeded event
                } );
            }

            else {
                h.getUserFullMedia().then( ( stream ) => {
                    //save my stream
                    myStream = stream;


                    stream.getTracks().forEach( ( track ) => {
                        pc[partnerName].addTrack( track, stream );//should trigger negotiationneeded event
                    } );

                    h.setLocalStream( stream );
                } ).catch( ( e ) => {
                    console.error( `stream error: ${ e }` );
                } );
            }



            //create offer
            if ( createOffer ) {
                pc[partnerName].onnegotiationneeded = async () => {
                    let offer = await pc[partnerName].createOffer();

                    await pc[partnerName].setLocalDescription( offer );

                    socket.emit( 'sdp', { description: pc[partnerName].localDescription, to: partnerName, sender: socketId } );
                };
            }



            //send ice candidate to partnerNames
            pc[partnerName].onicecandidate = ( { candidate } ) => {
                socket.emit( 'ice candidates', { candidate: candidate, to: partnerName, sender: socketId } );
            };



            //add
            pc[partnerName].ontrack = ( e ) => {
                let str = e.streams[0];
                if ( document.getElementById( `${ partnerName }-video` ) ) {
                    document.getElementById( `${ partnerName }-video` ).srcObject = str;
                }

                else {
                    //video elem
                    let newVid = document.createElement( 'video' );
                    newVid.id = `${ partnerName }-video`;
                    newVid.srcObject = str;
                    newVid.autoplay = true;
                    newVid.className = 'remote-video';

                    //video controls elements
                    let controlDiv = document.createElement( 'div' );
                    controlDiv.className = 'remote-video-controls';
                    // controlDiv.innerHTML = `<i class="fa fa-microphone text-white pr-3 mute-remote-mic" title="Mute"></i>
                    //     <i class="fa fa-expand text-white expand-remote-video" title="Expand"></i>`;

                    controlDiv.innerHTML = `  <button class="btn btn-sm rounded-0 btn-no-effect text-white" id="leave" onclick=NewTab()>
                    <a href="/?reolad=1" class="text-white text-decoration-none"><i class="fa fa-expand text-white expand-remote-video" title="Click to talk"></i></a>
                </button> `;

                    //create a new div for card
                    let cardDiv = document.createElement( 'div' );
                    cardDiv.className = 'card card-sm';
                    cardDiv.id = partnerName;
                    cardDiv.appendChild( newVid );
                    cardDiv.appendChild( controlDiv );

                    //put div in main-section elem
                    document.getElementById( 'videos' ).appendChild( cardDiv );

                    h.adjustVideoElemSize();
                }
            };



            pc[partnerName].onconnectionstatechange = ( d ) => {
                switch ( pc[partnerName].iceConnectionState ) {
                    case 'disconnected':
                    case 'failed':
                        h.closeVideo( partnerName );
                        break;

                    case 'closed':
                        h.closeVideo( partnerName );
                        break;
                }
            };



            pc[partnerName].onsignalingstatechange = ( d ) => {
                switch ( pc[partnerName].signalingState ) {
                    case 'closed':
                        console.log( "Signalling state is 'closed'" );
                        h.closeVideo( partnerName );
                        break;
                }
            };
        }


        function hideDiv(){
            var divsToHide = document.getElementsByClassName("remote-video"); //divsToHide is an array
            for(var i = 0; i < divsToHide.length; i++){
                // console.log('Inside loop');
                divsToHide[i].style.visibility = "hidden"; // or
                divsToHide[i].style.display = "none"; // depending on what you're doing
            }
        }

        function hideTeacherDiv(){
            var divsToHide = document.getElementsByClassName("local-video"); //divsToHide is an array
            for(var i = 0; i < divsToHide.length; i++){
                // console.log('Inside loop');
                divsToHide[i].style.visibility = "hidden"; // or
                divsToHide[i].style.display = "none"; // depending on what you're doing
            }

           

        }


        
        function shareScreen() {
          

            h.shareScreen().then( ( stream ) => {
                h.toggleShareIcons( true );

                //disable the video toggle btns while sharing screen. This is to ensure clicking on the btn does not interfere with the screen sharing
                //It will be enabled was user stopped sharing screen
                h.toggleVideoBtnDisabled( true );

                //save my screen stream
                screen = stream;

                //share the new stream with all partners
                broadcastNewTracksScreen( stream, 'video', false );
                // broadcastNewTracks( stream, 'video', false );

                //When the stop sharing button shown by the browser is clicked
                screen.getVideoTracks()[0].addEventListener( 'ended', () => {
                    stopSharingScreen();
                } );
            } ).catch( ( e ) => {
                console.error( e );
            } );
        }




        function stopSharingScreen() {
            //enable video toggle btn
            h.toggleVideoBtnDisabled( false );
try{
            return new Promise( ( res, rej ) => {
                screen.getTracks().length ? screen.getTracks().forEach( track => track.stop() ) : '';

                res();
            } ).then( () => {
                h.toggleShareIcons( false );
                broadcastNewTracks( myStream, 'video' );
            } ).catch( ( e ) => {
                console.error( e );
               
            } );

        }catch(e){
            broadcastNewTracks( myStream, 'video' );
        }
        }



        function broadcastNewTracks( stream, type, mirrorMode = true ) {
            h.setLocalStream( stream, mirrorMode );

            let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

            for ( let p in pc ) {
                let pName = pc[p];

                if ( typeof pc[pName] == 'object' ) {
                    h.replaceTrack( track, pc[pName] );
                }
            }
        }


        function broadcastNewTracksScreen( stream, type, mirrorMode = true ) {
            h.setSharedStream( stream, mirrorMode );

            let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

            for ( let p in pc ) {
                let pName = pc[p];
                if ( typeof pc[pName] == 'object' ) {
                    h.replaceTrack( track, pc[pName] );
                }
            }
        }


        function toggleRecordingIcons( isRecording ) {
            let e = document.getElementById( 'record' );

            if ( isRecording ) {
                e.setAttribute( 'title', 'Stop recording' );
                e.children[0].classList.add( 'text-danger' );
                e.children[0].classList.remove( 'text-white' );
            }

            else {
                e.setAttribute( 'title', 'Record' );
                e.children[0].classList.add( 'text-white' );
                e.children[0].classList.remove( 'text-danger' );
            }
        }


        function startRecording( stream ) {
            mediaRecorder = new MediaRecorder( stream, {
                mimeType: 'video/webm;codecs=vp9'
            } );

            mediaRecorder.start( 1000 );
            toggleRecordingIcons( true );

            mediaRecorder.ondataavailable = function ( e ) {
                recordedStream.push( e.data );
            };

            mediaRecorder.onstop = function () {
                toggleRecordingIcons( false );

                h.saveRecordedStream( recordedStream, username );

                setTimeout( () => {
                    recordedStream = [];
                }, 3000 );
            };

            mediaRecorder.onerror = function ( e ) {
                console.error( e );
            };
        }


        //Chat textarea
        document.getElementById( 'chat-input' ).addEventListener( 'keypress', ( e ) => {
            if ( e.which === 13 && ( e.target.value.trim() ) ) {
                e.preventDefault();

                sendMsg( e.target.value );

                setTimeout( () => {
                    e.target.value = '';
                }, 50 );
            }
        } );


        //When the video icon is clicked
        document.getElementById( 'toggle-video' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            let elem = document.getElementById( 'toggle-video' );

            if ( myStream.getVideoTracks()[0].enabled ) {
                e.target.classList.remove( 'fa-video' );
                e.target.classList.add( 'fa-video-slash' );
                elem.setAttribute( 'title', 'Show Video' );

                myStream.getVideoTracks()[0].enabled = false;
            }

            else {
                e.target.classList.remove( 'fa-video-slash' );
                e.target.classList.add( 'fa-video' );
                elem.setAttribute( 'title', 'Hide Video' );

                myStream.getVideoTracks()[0].enabled = true;
            }

            broadcastNewTracks( myStream, 'video' );
        } );


        //When the mute icon is clicked
        document.getElementById( 'toggle-mute' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            let elem = document.getElementById( 'toggle-mute' );

            if ( myStream.getAudioTracks()[0].enabled ) {
                e.target.classList.remove( 'fa-microphone-alt' );
                e.target.classList.add( 'fa-microphone-alt-slash' );
                elem.setAttribute( 'title', 'Unmute' );

                myStream.getAudioTracks()[0].enabled = false;
            }

            else {
                e.target.classList.remove( 'fa-microphone-alt-slash' );
                e.target.classList.add( 'fa-microphone-alt' );
                elem.setAttribute( 'title', 'Mute' );

                myStream.getAudioTracks()[0].enabled = true;
            }

            broadcastNewTracks( myStream, 'audio' );
        } );


        //When user clicks the 'Share screen' button
        document.getElementById( 'share-screen' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            if ( screen && screen.getVideoTracks().length && screen.getVideoTracks()[0].readyState != 'ended' ) {
                stopSharingScreen();
            }

            else {
                shareScreen();
            }
        } );


        //When record button is clicked
        document.getElementById( 'record' ).addEventListener( 'click', ( e ) => {
            /**
             * Ask user what they want to record.
             * Get the stream based on selection and start recording
             */
            if ( !mediaRecorder || mediaRecorder.state == 'inactive' ) {
                h.toggleModal( 'recording-options-modal', true );
            }

            else if ( mediaRecorder.state == 'paused' ) {
                mediaRecorder.resume();
            }

            else if ( mediaRecorder.state == 'recording' ) {
                mediaRecorder.stop();
            }
        } );


        //When user choose to record screen
        document.getElementById( 'record-screen' ).addEventListener( 'click', () => {
            h.toggleModal( 'recording-options-modal', false );

            if ( screen && screen.getVideoTracks().length ) {
                startRecording( screen );
            }

            else {
                h.shareScreen().then( ( screenStream ) => {
                    startRecording( screenStream );
                } ).catch( () => { } );
            }
        } );


        //When user choose to record own video
        document.getElementById( 'record-video' ).addEventListener( 'click', () => {
            h.toggleModal( 'recording-options-modal', false );

            if ( myStream && myStream.getTracks().length ) {
                startRecording( myStream );
            }

            else {
                h.getUserFullMedia().then( ( videoStream ) => {
                    startRecording( videoStream );
                } ).catch( () => { } );
            }
        } );

        if(is_student!=null && is_student=='1'){   
            setTimeout(function(){hideDiv() }, 2000);
            if(powertest!=null && powertest==0){
                setTimeout(function(){shareScreen() }, 2000);
            }
            
        }else if(is_teacher!=null && is_teacher=='1'){
            setTimeout(function(){hideTeacherDiv() }, 2000);
        }

        
    
    }

    

    function customLocalDiv(){
        var divsToHide = document.getElementsByClassName("remote-video"); //divsToHide is an array
        for(var i = 0; i < divsToHide.length; i++){
          
            divsToHide[i].style.top = '30px'; // depending on what you're doing
            // divsToHide[i].style.position = 'absolute';
            // divsToHide[i].style.width = '600px !important';
            // divsToHide[i].style.left = '50%';
            // divsToHide[i].style.transform = 'translate(-50%, 10px);';
            // divsToHide[i].style.display = 'none';
        }
    }

    function customTeacherDiv(){
        var divsToHide = document.getElementsByClassName("local-video"); //divsToHide is an array
        for(var i = 0; i < divsToHide.length; i++){
            // divsToHide[i].style.display = 'none';
            // divsToHide[i].style.top = '35px'; // depending on what you're doing
            // divsToHide[i].style.position = 'absolute';
            // divsToHide[i].style.width = '600px !important';
            // divsToHide[i].style.left = '50%';
            // divsToHide[i].style.transform = 'translate(-50%, 10px);';


        }
    }


} );
