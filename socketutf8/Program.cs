using System;
using System.Net.Sockets;
using System.Net;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.ComponentModel;


namespace socketutf8
{
    class Program
    {

        static Socket soc;

        // http://stackoverflow.com/questions/474679/capture-console-exit-c-sharp
        // Trap Exit Event
        [DllImport("Kernel32")]
        private static extern bool SetConsoleCtrlHandler(EventHandler handler, bool add);

        private delegate bool EventHandler(CtrlType sig);
        static EventHandler _handler;

        enum CtrlType
        {
            CTRL_C_EVENT = 0,
            CTRL_BREAK_EVENT = 1,
            CTRL_CLOSE_EVENT = 2,
            CTRL_LOGOFF_EVENT = 5,
            CTRL_SHUTDOWN_EVENT = 6
        }

        private static bool Handler(CtrlType sig)
        {
            switch (sig)
            {
                case CtrlType.CTRL_C_EVENT:
                case CtrlType.CTRL_LOGOFF_EVENT:
                case CtrlType.CTRL_SHUTDOWN_EVENT:
                case CtrlType.CTRL_CLOSE_EVENT:
                    soc.Send(System.Text.Encoding.UTF8.GetBytes("exit"));
                    return false;
                default:
                    return false;
            }
        }



        static void Main(string[] args)
        {

            // Trap Exit Event
            _handler += new EventHandler(Handler);
            SetConsoleCtrlHandler(_handler, true);


           // Console.Write( String.Join(",", args) + args.Length  );
            if (args.Length < 3)
            {
                Console.WriteLine("ERROR number of parameters, shouldbe\n\n  socketutf8 ip_string port_number any_string");
                //System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine();
                return;
            }

            var curPID = ParentProcessUtilities.GetParentProcess();

            Console.WriteLine("ParentPid: " + curPID.Id);
    


            string HOST = args[0];
            int PORT = int.Parse(args[1]);
            //string DATA = argList.AddRange( args );

            //JSON.stringify the args from index 2 to end into ARRAY: ["title", "client", "file"...]
            JavaScriptSerializer js = new JavaScriptSerializer();
            string DATA = js.Serialize(args);



            // http://stackoverflow.com/questions/8773721/how-to-send-a-string-over-a-socket-in-c-sharp

            /*****************
             * Connect to server
             * **************/

            soc = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);

            System.Net.IPAddress ipAdd = System.Net.IPAddress.Parse(HOST);
            //System.Net.IPAddress ipAdd = DNS_TO_IP(HOST);

            System.Net.IPEndPoint remoteEP = new IPEndPoint(ipAdd, PORT);

            try
            {
                soc.Connect(remoteEP);
            }
            catch (SocketException ex) {
                Console.WriteLine("Error connecting host, Msg:{1}", ipAdd.ToString(), ex.Message);
                //System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine();
                return;
            }



            /*****************
             * Sending string to server
             * **************/

            byte[] byData = System.Text.Encoding.UTF8.GetBytes(DATA);

            soc.Send(byData);
            Console.WriteLine("Successful sent to {0}", ipAdd.ToString());


            /*****************
             * Reading from server
             * **************/
            byte[] buffer = new byte[1024];
            int iRx = soc.Receive(buffer);
            char[] chars = new char[iRx];

            System.Text.Decoder d = System.Text.Encoding.UTF8.GetDecoder();
            int charLen = d.GetChars(buffer, 0, iRx, chars, 0);
            System.String recv = new System.String(chars);

            Console.WriteLine(recv);

            //System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine();


        }

        private IPAddress DNS_TO_IP(string HOST)
        {
            // http://stackoverflow.com/questions/13248971/c-sharp-resolve-hostname-to-ip

            IPHostEntry hostEntry;

            hostEntry = Dns.GetHostEntry(HOST);

            //you might get more than one ip for a hostname since 
            //DNS supports more than one record

            if (hostEntry.AddressList.Length <= 0)
            {
                Console.WriteLine("Cannot resolve ip address of {0}", HOST);
                //System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine();
                Environment.Exit(-1);
                return null;
            }

            var IP = hostEntry.AddressList[0];
            return IP;
        }
    }



    /// <summary>
    /// A utility class to determine a process parent.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct ParentProcessUtilities
    {
        // These members must match PROCESS_BASIC_INFORMATION
        internal IntPtr Reserved1;
        internal IntPtr PebBaseAddress;
        internal IntPtr Reserved2_0;
        internal IntPtr Reserved2_1;
        internal IntPtr UniqueProcessId;
        internal IntPtr InheritedFromUniqueProcessId;

        [DllImport("ntdll.dll")]
        private static extern int NtQueryInformationProcess(IntPtr processHandle, int processInformationClass, ref ParentProcessUtilities processInformation, int processInformationLength, out int returnLength);

        /// <summary>
        /// Gets the parent process of the current process.
        /// </summary>
        /// <returns>An instance of the Process class.</returns>
        public static Process GetParentProcess()
        {
            return GetParentProcess(Process.GetCurrentProcess().Handle);
        }

        /// <summary>
        /// Gets the parent process of specified process.
        /// </summary>
        /// <param name="id">The process id.</param>
        /// <returns>An instance of the Process class.</returns>
        public static Process GetParentProcess(int id)
        {
            Process process = Process.GetProcessById(id);
            return GetParentProcess(process.Handle);
        }

        /// <summary>
        /// Gets the parent process of a specified process.
        /// </summary>
        /// <param name="handle">The process handle.</param>
        /// <returns>An instance of the Process class.</returns>
        public static Process GetParentProcess(IntPtr handle)
        {
            ParentProcessUtilities pbi = new ParentProcessUtilities();
            int returnLength;
            int status = NtQueryInformationProcess(handle, 0, ref pbi, Marshal.SizeOf(pbi), out returnLength);
            if (status != 0)
                throw new Win32Exception(status);

            try
            {
                return Process.GetProcessById(pbi.InheritedFromUniqueProcessId.ToInt32());
            }
            catch (ArgumentException)
            {
                // not found
                return null;
            }
        }
    }

}
