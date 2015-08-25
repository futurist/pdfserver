using System;
using System.Net.Sockets;
using System.Net;
using System.Collections.Generic;
using System.Web.Script.Serialization;


namespace socketutf8
{
    class Program
    {



        static void Main(string[] args)
        {
           // Console.Write( String.Join(",", args) + args.Length  );
            if (args.Length < 3)
            {
                Console.WriteLine("ERROR number of parameters, shouldbe\n\n  socketutf8 ip_string port_number any_string");
                System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine(); System.Console.ReadLine();
                return;
            }

            
            string HOST = args[0];
            int PORT = int.Parse(args[1]);
            //string DATA = argList.AddRange( args );

            //JSON.stringify the args from index 2 to end into ARRAY: ["title", "client", "file"...]
            JavaScriptSerializer js = new JavaScriptSerializer();
            string DATA = js.Serialize(args);

            // http://stackoverflow.com/questions/13248971/c-sharp-resolve-hostname-to-ip
            
            IPHostEntry hostEntry;

            hostEntry= Dns.GetHostEntry(HOST);

            //you might get more than one ip for a hostname since 
            //DNS supports more than one record

            if (hostEntry.AddressList.Length <= 0) {
                Console.WriteLine("Cannot resolve ip address of {0}", HOST);
                Environment.Exit(-1);
                return;
            }
            
            var IP = hostEntry.AddressList[0];

            // http://stackoverflow.com/questions/8773721/how-to-send-a-string-over-a-socket-in-c-sharp

            /*****************
             * Connect to server
             * **************/

            Socket soc = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);

            //System.Net.IPAddress ipAdd = System.Net.IPAddress.Parse(IP);
            System.Net.IPAddress ipAdd = IP;

            System.Net.IPEndPoint remoteEP = new IPEndPoint(ipAdd, PORT);

            try
            {
                soc.Connect(remoteEP);
            }
            catch (SocketException ex) {
                Console.WriteLine("Error connecting host, Msg:{1}", IP.ToString(), ex.Message);
                return;
            }



            /*****************
             * Sending string to server
             * **************/

            byte[] byData = System.Text.Encoding.UTF8.GetBytes(DATA);

            soc.Send(byData);
            Console.WriteLine("Successful sent to {0}", IP.ToString());


            /*****************
             * Reading from server
             * **************/
            //byte[] buffer = new byte[1024];
            //int iRx = soc.Receive(buffer);
            //char[] chars = new char[iRx];

            //System.Text.Decoder d = System.Text.Encoding.UTF8.GetDecoder();
            //int charLen = d.GetChars(buffer, 0, iRx, chars, 0);
            //System.String recv = new System.String(chars);

            System.Console.ReadLine();



        }
    }
}
