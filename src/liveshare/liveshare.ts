import * as vscode from 'vscode'
import * as vsls from 'vsls/vscode'

import { lw } from '../lw'

const serviceName = 'test-explorer'
const pdfUpdateNotificationName = 'pdfUpdated'
const requestPdfRequestName = 'requestPdf'
// const invokeRemoteCommandRequestName = 'invokeRemoteCommand'
const logUpdateNotificationName = 'logUpdated'
const compilerUpdateNotificationName = 'compilerUpdated'

interface PdfArgs {
    path: string,
    content: string
}

export class LiveShare {
    private liveshare: vsls.LiveShare | undefined | null
    private hostService: vsls.SharedService | undefined | null
    private guestService: vsls.SharedServiceProxy | undefined | null
    private role: vsls.Role = vsls.Role.None

    constructor() {
        void this.init()
    }

    private async init() {
        this.liveshare = await vsls.getApi()
        if (!this.liveshare) {
            return
        }
        this.sessionRole = this.liveshare.session.role
        this.liveshare.onDidChangeSession(e => this.sessionRole = e.session.role, null)
    }

    private set sessionRole(role: vsls.Role) {
        this.role = role
        if (this.role === vsls.Role.Guest) {
            void this.initGuest()
        } else if (this.role === vsls.Role.Host) {
            void this.initHost()
        }
    }

    get isGuest(): boolean {
        return this.role === vsls.Role.Guest
    }

    get isHost(): boolean {
        return this.role === vsls.Role.Host
    }

    /********************************************************************
     *
     * Host
     *
     * *****************************************************************/
    private async initHost() {
        if (this.liveshare) {
            this.hostService = await this.liveshare.shareService(serviceName)
            if (this.hostService) {
                this.hostService.onRequest(requestPdfRequestName, (args: string[]) => this.onRequestPdf(args[0]))
                // this.hostService.onRequest(invokeRemoteCommandRequestName, (args: any[]) => { this.invokeRemoteCommand(args[0], args[1]) })
            }
        }
    }

    private async onRequestPdf(texPath: string): Promise<PdfArgs> {
        if (!this.liveshare) {
            throw new Error('Live Share should be initialized')
        }
        const parsedTexPath = this.liveshare.convertSharedUriToLocal(vscode.Uri.parse(texPath).with({ scheme: 'vsls' }))
        lw.file.getPdfPath(parsedTexPath.fsPath)
        const pdfPath = lw.file.getPdfPath(parsedTexPath.fsPath)
        lw.watcher.pdfForGuests.add(pdfPath)
        const fileArgs = await this.getPdfArgs(pdfPath)
        return fileArgs
    }

    private async getPdfArgs(pdfPath: string): Promise<PdfArgs> {
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(pdfPath))
        const base64Data = Buffer.from(content).toString('base64')
        const pdfbase64Path = `${pdfPath}.base64`
        const sharedUri = this.liveshare?.convertLocalUriToShared(vscode.Uri.file(pdfbase64Path))
        return {
            path: sharedUri.fsPath,
            content: base64Data
        }
    }

    async sendPdfUpdateToGuests(pdfPath: string) {
        console.log(this.hostService)
        if (this.hostService) {
            const fileArgs = await this.getPdfArgs(pdfPath)
            this.hostService.notify(pdfUpdateNotificationName, fileArgs)
        }
    }

    sendLogUpdateToGuests(message: string) {
        if (this.hostService) {
            this.hostService.notify(logUpdateNotificationName, { message })
        }
    }

    sendCompilerUpdateToGuests(message: string) {
        if (this.hostService) {
            this.hostService.notify(compilerUpdateNotificationName, { message })
        }
    }

    /********************************************************************
     *
     * Guest
     *
     * *****************************************************************/
    private async initGuest() {
        if (this.liveshare) {
            this.guestService = await this.liveshare.getSharedService(serviceName)
            if (this.guestService) {
                this.guestService.onNotify(pdfUpdateNotificationName, args => this.onPdfUpdated(args as PdfArgs))
                // this.guestService.onNotify(logUpdateNotificationName, async (args) => await this.onLogUpdated((args as any).message))
                // this.guestService.onNotify(compilerUpdateNotificationName, async (args) => await this.onCompilerUpdated((args as any).message))
            }
        }
    }

    private async writePdfbase64(pdfArgs: PdfArgs) {
        const buffer = Buffer.from(pdfArgs.content)
        const pdfbase64Path = `${pdfArgs.path}.base64`
        console.log('Quoc is here ', pdfbase64Path)
        await vscode.workspace.fs.writeFile(vscode.Uri.file(pdfbase64Path), buffer)
        console.log('Quoc is here')
    }

    private async onPdfUpdated(fileArgs: PdfArgs) {
        await this.writePdfbase64(fileArgs)
    }

    async requestPdf(texPath: string) {
        if (this.guestService) {
            const p = async () => {
                const results = await this.guestService?.request(requestPdfRequestName, [texPath]) as PdfArgs
                await this.writePdfbase64(results)
            }
            await p()
        }
    }
}
