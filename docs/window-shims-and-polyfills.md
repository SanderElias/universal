# Window shims and polyfills.

Please consult the [gotchas](./gotchas.md), as it containes the preferred way to solve the problems where we need those shims and polyfills for.

As part of the default installation we now provide a sample file on how you can provide `window` and `document` shims to your universal application. We created this on popular demand, and it serves as a starting point. 

> ## Note
> Please be aware that using the global scope can lead to memory leaks, and security issues.
> The shims and polyfills provided will not cause this by themselves, but if your application or any of its dependencies,
> stores or modifies _anything_ that is in the global scope (this includes, but is not limited to `window` and `document`) you are at risk.


## Why

We see a lot of questions on ngUniversal that revolve around using 3rth party libraries. With this addition we do provide a starting point, so you so have some samples and an idea how to tackle those issues. Once more, we would like to express that this is a last-resort solution, and you should really be using the other options available. The preferred way to deal with with this is utilizing the Angular injector.

## Location

We did generate a file called `windows-shims-and-polyfiles.ts` in a subfolder of the location where `server.ts` is created.

## How

Because we need to compile your applications code for use in node, weWe need 3 types of helpers. 
1. TypeScript shims.
2. Node shims
3. node polyfills

Those are needed, because even if the code isn't used when your app is rendered during SSR, it still needs to read and compile all of the code in your application.

### 1. TypeScript shims.

TypesScript shims are needed when your application throws type errors when it's compiled for us in universal. If the code inside the app is properly shielded by feature detection, nd doesn't run during SSR, TS might still complain about a missing type. This is the most easy kind of shim as it only involves the type system.When you look into  provided file, you will see:

```typescript
declare var global: {
  /** Reference to the window. */
  window: Window;
  /** Reference to the document. */
  document: Document;
  // ...
  /** Reference to SomeLibrary. */
  SomeLibrary: any;
  // ...
};
```

Lets take `SomeLibrary` as an example. We just assign any to it, so that any reference in the code would not cause an TS compilation error. As we have properly used feature detection, in our application, (as shown below) the code that is actually using the library is _not_ called at all. However, Typescript is still compiling the code, and will error out if it's not available on the global scope.

```typescript
import { Component, ElementRef, Inject, OnInit, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  constructor(
    private elmRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
    ) {}

  ngOnInit(): void {
    /**
     * We need the element anyway, and the nativeElement is
     * only available in the browser, not during SSR!
     * So we can can use that as feature detection.
     */
    const elm = this.elmRef.nativeElement as HTMLElement;
    if (elm) {
      /** somehow we made SomeLibrary available in the browser */
      SomeLibrary.addExitingFunctionality(elm);
    }
    /** as an alternative you can check for the existence of the lib */
    if (SomeLibrary) {
      SomeLibrary.addExitingFunctionality(elm);
    }
    /**
     * Or use isPlatformBrowser. Don't forget to inject the platformId then.
     */
    if (isPlatformBrowser(this.platformId)) {
      SomeLibrary.addExitingFunctionality(elm);
    }    
  }
}
```

When you have TypeScript typing error during compilation for SSR, start off with adding the missing type to the global decoration. the type `any` will do, but providing proper typing will help you discover problems sooner.

### 2. Node shims 

When your application is using some browser (or 3rth party) functionality that is not available in node, you might want to provide a stub function that as the same type signature, but isn't actually doing anything. I will take the Event function. It creates a new event. Still, there is no way you can trigger that during SSR. So its needs to pass compilation, but nothing more.

```typescript
global.Event = window.Event = (function () {} as unknown) as ((n) =>Event);
```

This will allow your app to compile and run during SSR. 

> ## note
> Perhaps you noticed the: `global.Event = window.Event = ...` in the above sample.  
> We did that because in the browser, all the things on `window` are also available in the global namespace. As we don't have control over how our 3rth parties are using those, we need to provide both.

### 3. node polyfills

Node polyfills are used where there is no other way around getting your application up and running. Lets say we have a legacy library that uses a requestAnimationFrame in its init routine, and it will crash SSR if its not there.

```typescript
global.requestAnimationFrame = window.requestAnimationFrame = (callback: FrameRequestCallback) => {
  setTimeout(() => callback(performance.now()))
  return 1
});
```

Here we mimic the `requestAnimationFrame` with a setTimout. We make sure the call signature is identical to what the browser provides. It needles to say that this is trikey. When the application uses `requestAnimationFrame` recursively, SSR will be stuck in an endless loop. This sample is chosen to show the danger of this approach.


## conclusion

We provide this file, to aid you getting up and running with universal. It shows how to shim stub or polyfill missing browser or 3rth party libraries. It serves as a starting point, from where you can build your own SSR solution. However, make sure your app doesn't leak memory or compromises security by using the provided globals. Make sure it is properly audited before you go to production.