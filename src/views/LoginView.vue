<script lang="ts">
  export default {

  }
</script>

<script lang="ts" setup>
  import AppBar from '../components/AppBar.vue';
  import { getAuth, GithubAuthProvider, signInWithPopup, GoogleAuthProvider, AuthProvider } from 'firebase/auth'

  import { useToast } from "vue-toastification";
  import router from '../router';

  const auth = getAuth();

  const githubProvider = new GithubAuthProvider();
  const googleProvider = new GoogleAuthProvider();

  const popupSignIn = (provider: AuthProvider) => {
    signInWithPopup(auth, provider)
    .then((result) => {
      if (auth.currentUser == null) {
        toast.success('Could not sign in!');
      }
    }).catch((error) => {
      console.error(error);
      toast.error('Error occurred while signing in!');
    });
  }

  const githubSignIn = () => popupSignIn(githubProvider)
  const googleSignIn = () => popupSignIn(googleProvider)

  const toast = useToast();

  const back = () => {
    router.push('/');
  }

  auth.onAuthStateChanged(() => {
    if (auth.currentUser != null) {
      toast.clear()
      toast.info('You are logged in!');
      setTimeout(() => {
        back()        
      }, 1000);
    }
  })
</script>

<template>
  <main class="w-full min-h-screen">
    <AppBar>
      <i class="fa-brands fa-google-drive text-2xl mr-2 text-green-300"></i>
      <span class="text-xl">Google Drive Clone</span>
    </AppBar>

    <div class="w-full flex flex-col items-center justify-center" style="min-height: 80vh;">
      <div class="rounded-xl text-center p-5 shadow-xl shadow-slate-700 border-x border-y border-slate-600" style="min-width: 50%; background: #222;">
        <div class="login">
          <span class="text-xl">
            Login to <i class="ml-2 fa-brands fa-google-drive text-2xl text-green-300"></i> Google Drive Clone
          </span>
        </div>
        <div class="flex flex-col">
          <button class="github-login bg-gray-700 px-2 py-1 rounded-xl my-2" v-wave="{
            color: 'gray',
            easing: 'ease-in'
          }" @click="githubSignIn">
            Login with <i class="fa-brands fa-github text-2xl"></i>
          </button>
          
          <button class="github-login bg-gray-700 px-2 py-1 rounded-xl my-2" v-wave="{
            color: 'gray',
            easing: 'ease-in'
          }" @click="googleSignIn">
            Login with <i class="fa-brands fa-google text-2xl"></i>
          </button>

        </div>
        
      </div>
    </div>
  </main>
</template>