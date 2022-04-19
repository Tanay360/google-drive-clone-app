<script lang="ts">
  import { defineStore } from 'pinia';
  
  interface File {
    id: string,
    fileName: string,
    path: string,
    parentId: 'root' | string,
    type: 'folder' | 'file',
    data?: string[],
    url?: string
  }

  export const useFilesStore = defineStore('files', {
    state() {
      return {
        files: [] as File[],
        currentSelection: 'root'
      }
    },
    actions: {
      changeSelection(selection: string, files: File[]) {
        this.currentSelection = selection;
        this.files = files;
      },
      changeFiles(files: File[]) {
        this.files = files;
      },
      addFiles(...files: File[]) {
        this.files.push(...files);
      },
      deleteFile(file: File) {
        this.files.filter((f) => f.id !== file.id);
      }
    }
  });
  
  export const useLoggedInStore = defineStore('loggedIn', {
    state()  {
      return {
        loggedIn: false
      }
    },
    actions: {
      userLoggedIn() {
        this.loggedIn = true;
      },
      userNotLoggedIn() {
        this.loggedIn = false;
      }
    }
  })

  
</script>

<script setup lang="ts">
  import AppBar from '../components/AppBar.vue';
  import AccountCircle from '../components/AccountCircle.vue';
  import { useToast } from 'vue-toastification';
  import { getAuth } from 'firebase/auth';
  import { addDoc, collection, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore'
  import router from '../router';
  import { ref } from '@vue/reactivity';
  
  const showOverFlowAddMenu = ref(false);
  const overflowOpen = ref(null as HTMLButtonElement | null);

  const folderName = ref('');
  const isCreateDialogOpen = ref(false);
  const openCreateDialog = () => isCreateDialogOpen.value = true;
  const closeCreateDialog = () => {
    console.log(folderName.value);
    isCreateDialogOpen.value = false;
    folderName.value = '';
  };

  const filesStore = useFilesStore();

  const db = getFirestore();
  const toast = useToast();
  const loggedInStore = useLoggedInStore();
  const auth = getAuth();
  auth.onAuthStateChanged(() => {
    if (auth.currentUser == null) {
      loggedInStore.userNotLoggedIn();
      toast.error('Please login to continue!');
      setTimeout(() => {
        login()
      }, 1000);
    } else {
      loggedInStore.userLoggedIn();
      loadRoot();
    }
  });

  function removeNullValues(arr: (File | null)[]): File[] {
    const files: File[] = [];
    for (let item of arr) {
      item && files.push(item);
    }
    return files;
  }

  const getFile = async (userId: string, fileId: string) => {
    const fileDoc = (await getDoc(doc(db, 'drive', 'userData', userId, fileId))).data();
    if (fileDoc == null) {
      return null;
    }
    const file: File = {
      id: fileId,
      parentId: fileDoc.parentId,
      type: fileDoc.type,
      fileName: fileDoc.fileName,
      path: fileDoc.path,
      data: fileDoc.data,
      url: fileDoc.url
    }
    return file;
  }

  const loadRoot = async () => {
    if (auth.currentUser == null) {
      return;
    }
    const uid = auth.currentUser.uid;
    
    const files = removeNullValues(await Promise.all((await getDocs(collection(db, 'drive', 'userData', uid, 'root', 'data'))).docs.map(async (a): Promise<File|null> => {
      const id = a.data().id as string;
      return await getFile(uid, id);
    })));
    filesStore.changeSelection('root', files);
  }

  const uploadToAnonFiles = (data: FormData): Promise<string> => {
    return new Promise((resolve,reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://google-drive-clone-server.herokuapp.com/postFile');
      xhr.send(data);
      xhr.onload = () => {
        resolve(xhr.responseText);
      }
      xhr.onerror = () => {
        reject(xhr.statusText);
      }
    })
  }

  const uploadFiles = () => {
    if (auth.currentUser == null) {
      return;
    }
    const uid = auth.currentUser.uid;
    const fileSelect = document.createElement('input');
    fileSelect.type = 'file';
    fileSelect.multiple = true;
    fileSelect.addEventListener('change', async () => {
      const files = fileSelect.files;
      if (!files)  {
        return;
      }
      
      for (let i = 0;i<files.length;i++){
        const file = files[i];
        const data = new FormData();
        data.append('file', file);
        const response = JSON.parse(await uploadToAnonFiles(data));
        const url = response.url.full as string;
        const currentFolder = filesStore.currentSelection;
        const folderRef = currentFolder != 'root' ? doc(db, 'drive', 'userData', uid, currentFolder): null;
        const folderDoc = currentFolder != 'root' ? (await getDoc(folderRef!)).data()!: null;
        const path = folderDoc ? folderDoc.path as string: '';
        const dbFile = {
          fileName: file.name,
          path: `${path}/${file.name}`,
          parentId: currentFolder,
          type: 'file',
          url: url
        }
        const newDoc = await addDoc(collection(db, 'drive', 'userData', uid), dbFile);
        const fileId = newDoc.id;
        if (folderRef && folderDoc) {
          const newData = [...folderDoc.data, fileId];
          await setDoc(folderRef, {
            ...folderDoc,
            data: newData
          });
        } else {
          await addDoc(collection(db, 'drive', 'userData', uid, 'root', 'data'), {
            id: fileId
          })
        }
        filesStore.addFiles({
          ...dbFile,
          id: fileId,
          type: 'file',
        })
      }
    
    })
    fileSelect.click();
    
  }

  const icons = {
    file: 'assets/icons/file-icon.svg',
    folder: 'assets/icons/folder-icon.svg',
    pdf: 'assets/icons/pdf-icon.svg',
    text: 'assets/icons/txt-icon.svg',
    image: 'assets/icons/image-icon.svg',
    archive: 'assets/icons/archive-icon.svg'
  }

  const getFileIcon = (file: File) => {
    if (file.type == 'folder') {
      return icons.folder;
    }
    const ff = file.fileName.split('.');
    if (ff.length == 1) {
      return icons.file;
    }
    const last = ff[ff.length - 1].toLowerCase();
    if (last == 'pdf') {
      return icons.pdf;
    }
    if (last == 'txt') {
      return icons.text;
    }
    if (last == 'jpg' || last == 'svg' || last == 'png' || last == 'jpeg') {
      return icons.image;
    }
    if (last == 'zip' || last == '7z' || last == 'rar') {
      return icons.archive;
    }
    return icons.file;
  }

  const saveData = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    return function (blob: Blob, fileName: string) {
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    };
  }());

  const downloadFile = async (file: File) => {
    toast.info(`Trying to download ${file.fileName}`)
    const url = encodeURIComponent(file.url!);
    const blob = await (await fetch(`https://google-drive-clone-server.herokuapp.com/downloadFile/${url}`)).blob();
    saveData(blob, file.fileName);
  }

  const logout = async () => await auth.signOut();

  const openFile = (file: File) => {
    if (file.type == 'file') {
      downloadFile(file).then(() => console.log('Success')).catch(() => {
        toast.error(`Failed to download ${file.fileName}`);
      })
    } else {
      openFolder(file).then(() => console.log('Success')).catch((e) => {
        console.error(e);
        toast.error(`Failed to open folder: ${file.fileName}`)
      })
    }
  }

  const openFolder = async (file: File) => {
    if (auth.currentUser == null) {
      toast.error('Login First!');
      return;
    }
    const uid = auth.currentUser.uid;
    if (file.type !== "folder") {
      throw 'File is not folder!';
    }
    const id = file.id;
    const folderRef = doc(db, 'drive', 'userData', uid, id);
    const folderDoc = (await getDoc(folderRef!)).data()!;
    const data = folderDoc.data as string[];
    const files = removeNullValues(await Promise.all(data.map(async (id) => {
      return await getFile(uid, id);
    })));
    filesStore.changeSelection(file.id, files);
  }

  const currentPath = ref('My Files')

  filesStore.$subscribe(async () => {
    const selection = filesStore.currentSelection;
    if (selection == 'root') {
      currentPath.value = 'My Files'
    } else {
      currentPath.value = await getPath(selection) || ''
    }
  })

  const newFolder = () => {
    openCreateDialog();
  }
  
  const createFolder = async () => {
    if (auth.currentUser == null) {
      toast.error('Login to continue!');
      return;
    }
    const uid = auth.currentUser.uid;
    isCreateDialogOpen.value = false;
    const value = folderName.value.trim();
    if (value == '') {
      folderName.value = '';
      toast.error('Could not create folder')
    } else {
      const currentFolder = filesStore.currentSelection;
      const folderRef = currentFolder != 'root' ? doc(db, 'drive', 'userData', uid, currentFolder): null;
      const folderDoc = currentFolder != 'root' ? (await getDoc(folderRef!)).data()!: null;
      const path = folderDoc ? folderDoc.path as string: '';
      const newFile = {
        type: 'folder',
        fileName: value,
        parentId: currentFolder,
        path: `${path}/${value}`,
        data: []
      }
      const newDoc = await addDoc(collection(db, 'drive', 'userData', uid), newFile);
      const fileId = newDoc.id;
      if (folderRef && folderDoc) {
        const newData = [...folderDoc.data, fileId];
        await setDoc(folderRef, {
          ...folderDoc,
          data: newData
        });
      } else {
        await addDoc(collection(db, 'drive', 'userData', uid, 'root', 'data'), {
          id: fileId
        })
      }
      filesStore.addFiles({
        ...newFile,
        id: fileId,
        type: 'folder'
      })
      toast.info(`Created Folder: ${value}`);
    }
  }

  const getPath = async (id: string) => {
    const uid = auth.currentUser!.uid;
    return (await getFile(uid, id))?.path
  }

  const _downloadAll = async (uid: string, selection: string) => {
    if (selection == 'root') {
      return;
    }
    const folder = await getFile(uid, selection);
    if (!folder || !folder.data) {
      toast.error('Failed to download files!');
      return;
    }
    const data = folder.data;
    for (let fileId of data) {
      const file = await getFile(uid, fileId);
      if (!file) {
        toast.error('Failed to download 1 file');
        return;
      }
      if (file.type == 'folder'){
        await _downloadAll(uid, file.id);
      } else {
        await downloadFile(file)
      }
    }
  }

  const downloadFolder = () => {
    if (auth.currentUser == null) {
      toast.error('Please login first!');
      return;
    }
    const uid = auth.currentUser.uid;
    const currentSelection = filesStore.currentSelection;
    if (currentSelection == 'root') {
      return;
    }
    _downloadAll(uid, currentSelection).then(() => {
      toast.info('Downloaded all files successfully!');
    }).catch((e) => {
      toast.error('Failed to download folder');
    })
  }
  
  const login = () => {
    router.push('/login')
  }
  const goUp = () => {
    (async () => {
      const uid = auth.currentUser!.uid;
      const folder = await getFile(uid, filesStore.currentSelection);
      const parent = folder!.parentId;
      if (parent == 'root') {
        await loadRoot()
      } else {
        await openFolder((await getFile(uid, parent))!);
      }
    })().then(() => console.log('Success!')).catch(() => {
      toast.error('Could not navigate up!');
    })
  }
</script>

<template>
  <main>
    <AppBar class="w-full fixed top-0 z-50">
      <i class="fa-brands fa-google-drive text-2xl mr-2 text-green-300"></i>
      <span class="text-xl">Google Drive Clone</span>
      <div class="flex absolute top-3 right-2" v-if="loggedInStore.loggedIn">
        <AccountCircle class="w-8 h-8"/>
        <vue-file-toolbar-menu :content="[
          {
            text: 'Account',
            menu: [
              {
                text: 'Logout', click: () => logout()
              },
            ]
          }
        ]" />
      </div>
      
    </AppBar>
    <div class="main-content p-4 flex flex-col min-h-screen mt-20" v-if="loggedInStore.loggedIn">
      <button class="absolute ripple-bg-emerald-600 rounded-full p-1" v-if="filesStore.currentSelection != 'root'" @click="goUp">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width: 32px; height: 32px;"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M447.1 256C447.1 273.7 433.7 288 416 288H109.3l105.4 105.4c12.5 12.5 12.5 32.75 0 45.25C208.4 444.9 200.2 448 192 448s-16.38-3.125-22.62-9.375l-160-160c-12.5-12.5-12.5-32.75 0-45.25l160-160c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25L109.3 224H416C433.7 224 447.1 238.3 447.1 256z" fill="#fff"/></svg>      
      </button>
      <a href="#" class="text-md font-bold bg-emerald-700 p-2 self-center rounded-md cursor-default hover:bg-emerald-800 hover:border hover:border-zinc-500 w-fit lg:w-96 md:w-72 sm:w-64 text-center shadow-md shadow-emerald-800" v-text="currentPath"></a>
      <button class="right-5 absolute ripple-bg-teal-600 rounded-full p-2" v-if="filesStore.currentSelection != 'root'" @click="downloadFolder">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width: 32px; height: 32px;"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M480 352h-133.5l-45.25 45.25C289.2 409.3 273.1 416 256 416s-33.16-6.656-45.25-18.75L165.5 352H32c-17.67 0-32 14.33-32 32v96c0 17.67 14.33 32 32 32h448c17.67 0 32-14.33 32-32v-96C512 366.3 497.7 352 480 352zM432 456c-13.2 0-24-10.8-24-24c0-13.2 10.8-24 24-24s24 10.8 24 24C456 445.2 445.2 456 432 456zM233.4 374.6C239.6 380.9 247.8 384 256 384s16.38-3.125 22.62-9.375l128-128c12.49-12.5 12.49-32.75 0-45.25c-12.5-12.5-32.76-12.5-45.25 0L288 274.8V32c0-17.67-14.33-32-32-32C238.3 0 224 14.33 224 32v242.8L150.6 201.4c-12.49-12.5-32.75-12.5-45.25 0c-12.49 12.5-12.49 32.75 0 45.25L233.4 374.6z" fill="#fff"/></svg>
      </button>

      <div class="files-cont grid grid-cols-3 my-5 2xl:grid-cols-12 xl:grid-cols-10 md:grid-cols-6 select-none" v-if="filesStore.files.length > 0">
        <button v-for="(item) in filesStore.files" :key="item.id" class="mr-4 py-2 px-4 bg-slate-800 border border-white select-none cursor-pointer rounded hover:bg-slate-900 hover:shadow-xl hover:shadow-slate-600 active:scale-110 items-center justify-center flex flex-col focus:border-2 focus:border-slate-500 focus:bg-slate-900 focus:scale-105" @click="openFile(item)">
          <img :src="getFileIcon(item)" class="w-16 h-16" :alt="item.fileName" draggable="false">
          <span class="text-base mt-2 whitespace-pre-wrap break-all">{{item.fileName}}</span>
        </button>
      </div>
      <button v-else class="self-center mt-24 text-center flex flex-col items-center border border-slate-600 p-4 rounded-md bg-slate-800 cursor-pointer active:scale-90 select-none active:bg-slate-900 hover:shadow-md hover:shadow-slate-500" @click="uploadFiles">
        <div class="w-32 h-32">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M105.4 182.6c12.5 12.49 32.76 12.5 45.25 .001L224 109.3V352c0 17.67 14.33 32 32 32c17.67 0 32-14.33 32-32V109.3l73.38 73.38c12.49 12.49 32.75 12.49 45.25-.001c12.49-12.49 12.49-32.75 0-45.25l-128-128C272.4 3.125 264.2 0 256 0S239.6 3.125 233.4 9.375L105.4 137.4C92.88 149.9 92.88 170.1 105.4 182.6zM480 352h-160c0 35.35-28.65 64-64 64s-64-28.65-64-64H32c-17.67 0-32 14.33-32 32v96c0 17.67 14.33 32 32 32h448c17.67 0 32-14.33 32-32v-96C512 366.3 497.7 352 480 352zM432 456c-13.2 0-24-10.8-24-24c0-13.2 10.8-24 24-24s24 10.8 24 24C456 445.2 445.2 456 432 456z"/></svg>
        </div>
        <span class="text-lg mt-4">Upload to get started</span>
      </button>
      <div class="fixed flex flex-col z-50 bottom-10 right-10">
        <div class="cont mb-4" v-if="showOverFlowAddMenu">
          <button class="w-12 mb-2 h-12 flex justify-center align-center bg-lime-800 p-2 rounded-full active:scale-75 hover:bg-green-800 shadow-md shadow-stone-600 hover:shadow-stone-400" @click="newFolder">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-6 h-6"><path d="M464 96h-192l-64-64h-160C21.5 32 0 53.5 0 80v352C0 458.5 21.5 480 48 480h416c26.5 0 48-21.5 48-48v-288C512 117.5 490.5 96 464 96zM336 311.1h-56v56C279.1 381.3 269.3 392 256 392c-13.27 0-23.1-10.74-23.1-23.1V311.1H175.1C162.7 311.1 152 301.3 152 288c0-13.26 10.74-23.1 23.1-23.1h56V207.1C232 194.7 242.7 184 256 184s23.1 10.74 23.1 23.1V264h56C349.3 264 360 274.7 360 288S349.3 311.1 336 311.1z" fill="#fff"/></svg>
          </button>      
          <button class="w-12 h-12 flex justify-center align-center bg-lime-800 p-2 rounded-full active:scale-75 hover:bg-green-800 shadow-md shadow-stone-600 hover:shadow-stone-400" @click="uploadFiles">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-6 h-6"><path fill="#fff" d="M105.4 182.6c12.5 12.49 32.76 12.5 45.25 .001L224 109.3V352c0 17.67 14.33 32 32 32c17.67 0 32-14.33 32-32V109.3l73.38 73.38c12.49 12.49 32.75 12.49 45.25-.001c12.49-12.49 12.49-32.75 0-45.25l-128-128C272.4 3.125 264.2 0 256 0S239.6 3.125 233.4 9.375L105.4 137.4C92.88 149.9 92.88 170.1 105.4 182.6zM480 352h-160c0 35.35-28.65 64-64 64s-64-28.65-64-64H32c-17.67 0-32 14.33-32 32v96c0 17.67 14.33 32 32 32h448c17.67 0 32-14.33 32-32v-96C512 366.3 497.7 352 480 352zM432 456c-13.2 0-24-10.8-24-24c0-13.2 10.8-24 24-24s24 10.8 24 24C456 445.2 445.2 456 432 456z"/></svg>
          </button>      
        </div>
        <button ref="overflowOpen" class="bg-stone-600 p-2 w-14 h-14  rounded-full hover:bg-slate-700 shadow-md shadow-stone-600 hover:shadow-stone-400" @click="() => {
          if (overflowOpen) {
            if (!showOverFlowAddMenu) {
              overflowOpen.style.backgroundColor = 'rgb(51 65 85)'
              overflowOpen.style.transform = 'rotate(45deg)';
            } else {
              overflowOpen.style.backgroundColor = '';
              overflowOpen.style.transform = '';
            }
          }
          showOverFlowAddMenu = !showOverFlowAddMenu;
        }">
          <i class="fa-solid fa-plus text-4xl"></i>
        </button>
      </div>
    </div>
      
    </main>
    <Modal
      v-model="isCreateDialogOpen"
      :close="closeCreateDialog">
        <div class="bg-neutral-800 shadow-sm shadow-neutral-600 px-10 py-5 rounded-md flex flex-col items-center items-width-fit" style="min-width: 50%;">
            <div class="min-w-full md:w-1/3 px-3 mb-6 md:mb-0">
              <label class="block tracking-wide text-gray-200 text-md mb-2" for="folder-input">
                Create New Folder
              </label>
              <input class="appearance-none block min-w-full bg-slate-900 text-gray-200 border border-gray-600 rounded py-3 px-4 leading-tight focus:outline-none focus:text-gray-50 focus:bg-stone-800 focus:shadow-outline shadow shadow-slate-500 focus:shadow-none focus:border-4" id="folder-input" type="text" placeholder="Folder Name" v-model="folderName">
            </div>
          <div class="actions self-end mt-4">
            <button class="ripple-bg-green-700 rounded-md py-2 px-4 mx-4" @click="closeCreateDialog">Close</button>
            <button class="ripple-bg-teal-500 rounded-md py-2 px-4" @click="createFolder">Create</button>
          </div>
        </div>
    </Modal>
</template>

<style scoped>
  .items-width-fit * {
    width: fit-content;
  }
</style>